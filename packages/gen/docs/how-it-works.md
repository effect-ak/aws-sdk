# How the AWS SDK Generator Works

This document provides detailed technical information about the code generation process, architecture decisions, and internal implementation.

## Overview

The generator consists of three main phases:

1. **Scanning** - Analyze AWS SDK packages to extract types and commands
2. **Code Generation** - Generate Effect-TS wrapper code
3. **Index Generation** - Create re-exports and convenience helpers

## 1. Scanning Phase (`scan.ts`)

The generator uses `ts-morph` to analyze AWS SDK packages and extract:

- **Client class** (e.g., `S3Client`, `SSMClient`)
- **Service exception class** (e.g., `S3ServiceException`, `SSMServiceException`)
- **Config interface** (e.g., `S3ClientConfig`)
- **Commands** - All `*Command` classes with their:
  - Input types (`*CommandInput`)
  - Output types (`*CommandOutput`)
  - Exception types from JSDoc `@throws` annotations

## 2. Code Generation Phase (`write.ts`)

For each AWS SDK client, generates a TypeScript file with the following components:

### a. Imports

```typescript
import * as Sdk from "@aws-sdk/client-s3";
import type { AllErrors } from "./internal/utils.js";
```

Uses namespace import (`import * as Sdk`) for better tree-shaking of the entire client package.

### b. Client Service Class

```typescript
export class S3Client extends Context.Tag('S3Client')<S3Client, Sdk.S3Client>() {
  static Default = (config?: Sdk.S3ClientConfig) =>
    Layer.effect(S3Client, Effect.gen(function* () {
      return new Sdk.S3Client(config ?? {})
    }))
}
```

An Effect Context.Tag for dependency injection with a `.Default` layer factory. If `global.region` is configured, it will be injected here.

### c. Main Function

```typescript
/**
 * Creates an Effect that executes an AWS S3 command.
 */
export const make = Effect.fn('aws_S3')(function* <M extends keyof S3Api>(
  actionName: M,
  actionInput: S3Api[M][0]
) {
  yield* Effect.logDebug(`aws_S3.${actionName}`, { input: actionInput })

  const client = yield* S3Client
  const command = new S3CommandFactory[actionName](actionInput) as Parameters<typeof client.send>[0]

  const result = yield* Effect.tryPromise({
    try: () => client.send(command) as Promise<S3Api[M][1]>,
    catch: (error) => {
      if (error instanceof Sdk.S3ServiceException) {
        return new S3Error(error, actionName)
      }
      throw error
    }
  })

  yield* Effect.logDebug(`aws_S3.${actionName} completed`)

  return result
})
```

A unified Effect function for all AWS operations with automatic tracing via `Effect.fn` and debug logging for observability.

### d. API Type (Internal)

```typescript
type S3Api = {
  create_bucket: [
    Sdk.CreateBucketCommandInput,
    Sdk.CreateBucketCommandOutput,
    { "BucketAlreadyExists": Sdk.BucketAlreadyExists, ... }
  ]
  get_object: [Sdk.GetObjectCommandInput, Sdk.GetObjectCommandOutput, { ... }]
  // ... all commands
}
```

Maps command names to `[Input, Output, Errors]` tuples. Internal type, not exported.

### e. Command Factory (Internal)

```typescript
const S3CommandFactory: { [M in keyof S3Api]: new (args: S3Api[M][0]) => unknown } = {
  create_bucket: Sdk.CreateBucketCommand,
  get_object: Sdk.GetObjectCommand,
  // ... all commands
}
```

Runtime mapping for dynamic command instantiation. Internal, not exported.

### f. Error Class

```typescript
export class S3Error<C extends keyof S3Api> {
  readonly _tag = "S3Error";

  constructor(
    readonly cause: Sdk.S3ServiceException,
    readonly command: C
  ) {}

  // Type guard for command-specific errors
  $is<N extends keyof S3Api[C][2]>(name: N): this is S3Error<C> {
    return this.cause.name == name;
  }

  // Type guard for any error across all commands
  is<N extends keyof AllErrors<S3Api>>(name: N): this is S3Error<C> {
    return this.cause.name == name;
  }
}
```

Typed error class with two type guards:
- `$is()` - Check command-specific errors (autocomplete shows only errors documented for that command)
- `is()` - Check any error from the entire API (fallback when JSDoc is incomplete)

### g. Exported Types

```typescript
export type S3MethodInput<M extends keyof S3Api> = S3Api[M][0]
```

Helper type for accessing input types.

### h. Internal Utils (`internal/utils.ts`)

Generated once per package, contains shared type utilities:

```typescript
type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

export type AllErrors<Api extends Record<string, [unknown, unknown, Record<string, unknown> | never]>> =
  UnionToIntersection<{
    [C in keyof Api]: Api[C][2] extends never ? {} : {
      [E in keyof Api[C][2]]: Api[C][2][E]
    }
  }[keyof Api]> extends infer I ? { [K in keyof I]: I[K] } : never;
```

Merges all error types from all commands into a single union for the `is()` type guard.

## 3. Index Generation

Creates `index.ts` that re-exports all generated clients as namespaces and provides convenience helpers:

```typescript
import * as Layer from "effect/Layer";
import type { S3ClientConfig } from "@aws-sdk/client-s3";
import type { SSMClientConfig } from "@aws-sdk/client-ssm";
import * as s3 from "./s3.js";
import * as ssm from "./ssm.js";

export { s3 };
export { ssm };

// All clients with default configuration
export const AllClientsDefault = Layer.mergeAll(
  s3.S3Client.Default(),
  ssm.SSMClient.Default()
);

// Customizable client configuration
export const makeClients = (config?: {
  s3?: S3ClientConfig,
  ssm?: SSMClientConfig
}) => Layer.mergeAll(
  s3.S3Client.Default(config?.s3),
  ssm.SSMClient.Default(config?.ssm)
);
```

## Architecture Decisions

### Why `import * as Sdk`?

All commands are included in the generated factory, so individual named imports don't provide tree-shaking benefits. A namespace import keeps the generated code cleaner (one line vs. 50+ imports).

### Why Internal Types?

- `S3Api` - Only used for typing the main function and error class
- `S3CommandFactory` - Only used at runtime for command instantiation
- Users interact with the exported function and error class, not these internals

### Why Two Type Guards?

- `$is()` - Use when you know which command you're handling (best DX, precise types)
- `is()` - Use when AWS JSDoc doesn't document errors for a command (fallback safety)

### Why `Effect.fn` Tracing?

Automatic span creation (`aws_S3`) for observability without manual instrumentation. Additionally, debug logging is added at the start and completion of each command for easier troubleshooting.

### Why Tuple `[Input, Output, Errors]`?

Compact representation that ties all related types together. Single generic parameter `M` provides access to all three via indexing.

## File Structure

```
packages/gen/
├── src/
│   ├── bin/
│   │   ├── generate.ts      # CLI entry point
│   │   └── postinstall.ts   # Auto-run after install
│   ├── config.ts            # Configuration management
│   ├── scan.ts              # AWS SDK package scanning
│   ├── write.ts             # Code generation logic
│   ├── main.ts              # Orchestration
│   └── type.ts              # Type definitions
└── generated/               # Output directory
    ├── internal/
    │   └── utils.ts         # Shared type utilities
    ├── s3.ts                # Generated S3 wrapper
    ├── ssm.ts               # Generated SSM wrapper
    └── index.ts             # Re-exports
```

## Dependencies

- `ts-morph` - TypeScript AST manipulation for scanning AWS SDK packages
- `effect` - Effect-TS runtime
- AWS SDK v3 packages - Scanned at runtime to extract types and commands
