[![NPM Version](https://img.shields.io/npm/v/%40effect-ak%2Faws-sdk)](https://www.npmjs.com/package/@effect-ak/aws-sdk)
![NPM Downloads](https://img.shields.io/npm/dw/%40effect-ak%2Faws-sdk)

## Motivation

I wanted to work with the AWS SDK using effects instead of promises. The main drawback of AWS SDK libraries that rely on promises is error handling. For example, when using the SDK to create a function that already exists, we might want to update the function's code instead of failing with an exception. Implementing such straightforward scenarios is very cumbersome with promises, whereas `effect-ts` allows you to seamlessly write complex workflows without increasing the complexity of understanding the code.

This library provides the following features:

- **Code Generation**: Generates wrapper clients that utilize effects (`effect-ts`).
- **Operation Discovery**: Identifies all available operations along with their input parameters and outputs.
- **Error Handling**: Detects all error classes and determines which methods throw which errors (as specified in JSDoc comments). This allows us to capture all expected errors and integrate them into the effect error channel.

### Example

Find more [here](./example/)

This example demonstrates how to use your solution to create an S3 bucket and enable versioning. It handles the scenario where the bucket already exists by updating its versioning configuration instead.

```typescript
import { makeS3Client, S3ClientTag, s3 } from "./generated/s3.js";
import { Effect, Layer, pipe } from "effect";

// Define the live layer with the S3 client
const live =
  Layer.effect(S3ClientTag, makeS3Client({ region: "us-east-1" }));

// Effect to create or update the S3 bucket
const setupBucket = Effect.gen(function* () {
  const bucketName = "my-unique-bucket";

  yield* pipe(
    // Attempt to create the bucket
    s3("create_bucket", { Bucket: bucketName }),
    Effect.catchTag("BucketAlreadyExists", () =>
      // If it exists, enable versioning
      s3("put_bucket_versioning", {
        Bucket: bucketName,
        VersioningConfiguration: { Status: "Enabled" },
      })
    ),
    Effect.tap(() => Effect.logInfo(`Bucket "${bucketName}" is ready.`))
  );
});

// Run the effect with the live layer
setupBucket
  .pipe(
    Effect.provide(live),
    Effect.runPromise
  )
  .finally(() => {
    console.info("Bucket setup complete.");
  });
```

### Benefits Highlighted

- **Composability**: Easily composes AWS service interactions using effects.
- **Error Handling**: Gracefully handles specific AWS errors and provides alternative flows.
- **Resource Management**: Manages AWS resources declaratively and ensures proper configuration.
- **Logging**: Integrates logging for better observability of operations.

This example showcases how your solution can simplify AWS resource management with robust error handling and clean, declarative code.
