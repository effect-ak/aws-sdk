import { Duration, Effect, Schema as S } from "effect";
import { sqs } from "./clients/index.js"

export type InvalidMessage = {
  body: string
  error: string
}

type ReceiveMessagesOptions<I, E, R> = {
  queueUrl: string
  messageSchema: S.Schema<I>
  visibilityTimeout: Duration.DurationInput
  maxMessages?: number
  waitTime?: Duration.DurationInput
  onInvalidMessage?: (msg: InvalidMessage) => Effect.Effect<void, E, R>
}

export type ReceivedMessage<I> = {
  message: I
  receiptHandle: string
}

export type ReceiveMessagesResult<I> = {
  valid: ReceivedMessage<I>[]
  invalid: InvalidMessage[]
}

const dlqCache = new Map<string, boolean>();

const hasDeadLetterQueue = (queueUrl: string) =>
  Effect.gen(function* () {
    const cached = dlqCache.get(queueUrl);
    if (cached !== undefined) return cached;

    const attrs = yield* sqs.make("get_queue_attributes", {
      QueueUrl: queueUrl,
      AttributeNames: ["RedrivePolicy"]
    });

    const hasDLQ = attrs.Attributes?.RedrivePolicy != null;
    dlqCache.set(queueUrl, hasDLQ);

    yield* Effect.logDebug(`Queue ${queueUrl} has DLQ: ${hasDLQ}`);

    return hasDLQ;
  });

/**
 * Receives and parses messages from an SQS queue.
 *
 * Automatically detects if the queue has a Dead Letter Queue configured.
 * If DLQ exists, invalid messages are left in the queue to be retried/moved to DLQ.
 * If no DLQ, invalid messages are deleted after calling onInvalidMessage callback.
 *
 * @param queueUrl - The SQS queue URL
 * @param messageSchema - Schema to validate and parse message body
 * @param visibilityTimeout - How long messages stay invisible after being received
 * @param maxMessages - Maximum number of messages to receive (1-10, default 10)
 * @param waitTime - Long polling wait time (default 0 for short polling)
 * @param onInvalidMessage - Optional callback for handling messages that fail schema validation
 *
 * @returns Object with `valid` (parsed messages with receipt handles) and `invalid` (failed messages)
 *
 * @example
 * ```ts
 * const { valid, invalid } = yield* receiveMessages({
 *   queueUrl: "https://sqs.eu-west-1.amazonaws.com/123/my-queue",
 *   messageSchema: S.Struct({ userId: S.String, action: S.String }),
 *   visibilityTimeout: Duration.seconds(30),
 *   maxMessages: 5,
 *   waitTime: Duration.seconds(20), // long polling
 *   onInvalidMessage: (msg) => saveToDeadLetterTable(msg)
 * })
 *
 * for (const { message, receiptHandle } of valid) {
 *   yield* processMessage(message)
 *   yield* deleteMessages({ queueUrl, receiptHandle: [receiptHandle] })
 * }
 * ```
 */
export const receiveMessages =
  <I, E, R>({
    queueUrl,
    messageSchema,
    visibilityTimeout,
    maxMessages = 10,
    waitTime = Duration.zero,
    onInvalidMessage
  }: ReceiveMessagesOptions<I, E, R>) =>
  Effect.fn("receive messages from sqs")(function* () {

    const updates =
      yield* sqs.make("receive_message", {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: maxMessages,
        VisibilityTimeout: Duration.toSeconds(visibilityTimeout),
        WaitTimeSeconds: Duration.toSeconds(waitTime)
      });

    if (!updates.Messages) return { valid: [], invalid: [] } as ReceiveMessagesResult<I>;

    yield* Effect.logInfo("Received queue messages", updates.Messages.length);

    const invalid = [] as (InvalidMessage & { receiptHandle: string })[];
    const valid = [] as ReceivedMessage<I>[];

    for (const message of updates.Messages) {
      if (!message.ReceiptHandle) continue;
      const payload = S.decodeUnknownEither(S.parseJson(messageSchema))(message.Body);
      if (payload._tag == "Left") {
        invalid.push({
          receiptHandle: message.ReceiptHandle,
          body: message.Body ?? "",
          error: payload.left.message
        })
        yield* Effect.logWarning("invalid message", payload.left.message)
        continue
      }
      valid.push({
        message: payload.right,
        receiptHandle: message.ReceiptHandle
      })
    }

    if (invalid.length > 0) {
      if (onInvalidMessage) {
        for (const msg of invalid) {
          yield* onInvalidMessage({
            body: msg.body,
            error: msg.error
          })
        }
      }

      const hasDLQ = yield* hasDeadLetterQueue(queueUrl);

      if (!hasDLQ) {
        yield* deleteMessages({
          receiptHandle: invalid.map(_ => _.receiptHandle),
          queueUrl
        });
        yield* Effect.logWarning(`No DLQ configured. Removed ${invalid.length} invalid messages from queue`);
      } else {
        yield* Effect.logDebug(`DLQ configured. Leaving ${invalid.length} invalid messages for retry/DLQ`);
      }
    }

    return {
      valid,
      invalid: invalid.map(({ body, error }) => ({ body, error }))
    } as ReceiveMessagesResult<I>;

  });


type DeleteMessagesOptions = {
  queueUrl: string
  receiptHandle: string[]
}

/**
 * Deletes messages from an SQS queue by their receipt handles.
 *
 * @param queueUrl - The SQS queue URL
 * @param receiptHandle - Array of receipt handles to delete
 */
export const deleteMessages =
  Effect.fn("delete messages")(function* ({
    queueUrl, receiptHandle
  }: DeleteMessagesOptions) {

    const result =
      yield* sqs.make("delete_message_batch", {
        QueueUrl: queueUrl,
        Entries:
          receiptHandle.map((handle, id) => ({
            ReceiptHandle: handle,
            Id: id.toString()
          }))
      });

    if (result.Failed != null && result.Failed.length > 0) {
      yield* Effect.logWarning("Some messages weren't deleted", result.Failed)
    }

  })
