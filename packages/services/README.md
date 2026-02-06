# @effect-ak/aws-services

High-level Effect-based workflows for AWS, built on top of [@effect-ak/aws-sdk](../gen/).

## Overview

This package provides Effect-first abstractions for common AWS patterns and workflows. Instead of working directly with low-level AWS SDK clients, you get composable Effect services that handle common use cases.

## Installation

```bash
npm install @effect-ak/aws-services effect
```

## What's Included

### Services

- **ParameterStore** - Load and validate TOML configs from SSM Parameter Store
- **SQS** - Smart message processing with schema validation and DLQ detection

### Pre-generated Clients

Generated Effect wrappers for SSM and SQS using `@effect-ak/aws-sdk`.

## Quick Examples

### ParameterStore

```typescript
import { Effect, Schema as S } from "effect";
import * as ParameterStore from "@effect-ak/aws-services/parameter-store";
import { ssm } from "@effect-ak/aws-services";

const ConfigSchema = S.Struct({
  apiKey: S.String,
  timeout: S.Number
});

const program = Effect.gen(function* () {
  const config = yield* ParameterStore.getConfigFromParameterStore({
    path: "/my-app/config",
    configSchema: ConfigSchema
  });
  return config;
}).pipe(Effect.provide(ssm.SSMClient.Default()));
```

### SQS

```typescript
import { Effect, Schema as S, Duration } from "effect";
import * as SQS from "@effect-ak/aws-services/sqs";
import { sqs } from "@effect-ak/aws-services";

const MessageSchema = S.Struct({ userId: S.String, action: S.String });

const program = Effect.gen(function* () {
  const { valid, invalid } = yield* SQS.receiveMessages({
    queueUrl: "https://sqs.us-east-1.amazonaws.com/123/queue",
    messageSchema: MessageSchema,
    visibilityTimeout: Duration.seconds(30),
    maxMessages: 10
  });

  for (const { message, receiptHandle } of valid) {
    yield* processMessage(message);
    yield* SQS.deleteMessages({ queueUrl, receiptHandle: [receiptHandle] });
  }
}).pipe(Effect.provide(sqs.SQSClient.Default()));
```

### Using Generated Clients

```typescript
import { ssm, sqs, AllClientsDefault } from "@effect-ak/aws-services";

const program = Effect.gen(function* () {
  yield* ssm.make("put_parameter", { Name: "/key", Value: "val" });
  yield* sqs.make("send_message", { QueueUrl: "...", MessageBody: "..." });
}).pipe(Effect.provide(AllClientsDefault));
```

## Roadmap

More AWS workflow services coming soon. Contributions welcome!

## License

MIT
