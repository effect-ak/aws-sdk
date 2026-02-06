import { Effect, Schema as S, Logger, LogLevel, Duration } from "effect";
import { sqs, makeClients } from "../src/clients/index.js";
import { receiveMessages, deleteMessages } from "../src/sqs.js";
import { describe, it, expect } from "vitest";

const TestMessageSchema = S.Struct({
  userId: S.String,
  action: S.String
});

const TEST_QUEUE_URL = process.env.TEST_SQS_QUEUE_URL ?? "";

describe("receiveMessages", () => {

  it("should send and receive messages from SQS queue", async () => {
    if (!TEST_QUEUE_URL) {
      console.log("Skipping test: TEST_SQS_QUEUE_URL not set");
      return;
    }

    const clients = makeClients({ sqs: { region: "eu-west-1" } });

    const program = Effect.gen(function* () {
      // Send test messages
      yield* Effect.log("Sending test messages");

      yield* sqs.make("send_message_batch", {
        QueueUrl: TEST_QUEUE_URL,
        Entries: [
          { Id: "1", MessageBody: JSON.stringify({ userId: "user-1", action: "login" }) },
          { Id: "2", MessageBody: JSON.stringify({ userId: "user-2", action: "logout" }) },
          { Id: "3", MessageBody: "invalid json {{{" } // invalid message
        ]
      });

      yield* Effect.log("Messages sent, waiting a bit for visibility");
      yield* Effect.sleep(Duration.seconds(1));

      // Receive and parse messages
      const invalidMessages: { body: string; error: string }[] = [];

      const result = yield* receiveMessages({
        queueUrl: TEST_QUEUE_URL,
        messageSchema: TestMessageSchema,
        visibilityTimeout: Duration.seconds(30),
        maxMessages: 10,
        onInvalidMessage: (msg) =>
          Effect.sync(() => {
            invalidMessages.push(msg);
          })
      });

      yield* Effect.log(`Received ${result.valid.length} valid, ${result.invalid.length} invalid messages`);

      // Verify valid messages
      expect(result.valid.length).toBeGreaterThanOrEqual(2);

      const userIds = result.valid.map(m => m.message.userId);
      expect(userIds).toContain("user-1");
      expect(userIds).toContain("user-2");

      // Verify invalid messages were captured
      expect(invalidMessages.length).toBeGreaterThanOrEqual(1);
      expect(invalidMessages[0].body).toContain("invalid json");

      // Cleanup: delete valid messages
      if (result.valid.length > 0) {
        yield* deleteMessages({
          queueUrl: TEST_QUEUE_URL,
          receiptHandle: result.valid.map(m => m.receiptHandle)
        });
        yield* Effect.log("Cleaned up valid messages");
      }

      return result;
    }).pipe(
      Effect.provide(clients)
    );

    const result = await program.pipe(
      Logger.withMinimumLogLevel(LogLevel.All),
      Effect.runPromiseExit
    );

    if (result._tag === "Failure") {
      console.log("Test failed:", result.cause);
    }

    expect(result._tag).toBe("Success");
  });

});
