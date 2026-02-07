# Effect AWS SDK

TypeScript-first AWS development with [Effect-TS](https://effect.website/).

[![NPM Version](https://img.shields.io/npm/v/%40effect-ak%2Faws-sdk)](https://www.npmjs.com/package/@effect-ak/aws-sdk)
![NPM Downloads](https://img.shields.io/npm/dw/%40effect-ak%2Faws-sdk)

Code generator that creates Effect-TS wrappers for AWS SDK v3 clients.

## Features

- Effect-wrapped AWS operations with automatic tracing
- Type-safe error handling with command-specific type guards
- Automatic code generation from AWS SDK packages

## Quick Example

```typescript
import { Effect } from "effect";
import { s3 } from "@effect-ak/aws-sdk";

const program = Effect.gen(function* () {
  const result = yield* s3.make("create_bucket", { Bucket: "my-bucket" });
  return result;
}).pipe(
  Effect.catchIf(_ => _.$is("BucketAlreadyExists"), () => Effect.succeed("exists")),
  Effect.provide(s3.S3Client.Default())
);
```

---

## License

MIT
