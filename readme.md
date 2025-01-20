[![NPM Version](https://img.shields.io/npm/v/%40effect-ak%2Faws-sdk)](https://www.npmjs.com/package/@effect-ak/aws-sdk)
![NPM Downloads](https://img.shields.io/npm/dw/%40effect-ak%2Faws-sdk)

## Motivation

Here, I want to briefly explain the purpose of this generator.

I want to write scripts that assume there will be many errors, from which recovery is necessary, and to follow different scenarios.

The AWS SDK throws errors, and writing such code becomes inconvenient.

There is a very cool and powerful library called Effect, which offers a way to handle errors like this: [Effect Error Management](https://effect.website/docs/error-management/expected-errors/).

## Usage Example

The `createBucketOrUpdateTag` function creates an S3 bucket.

If AWS S3 returns an error indicating that the bucket already exists, the function updates the `triedToCreate` tag with the current date and time.

This example doesn't have a real-world use case but showcases how a complex workflow can be built based on expected errors.

```typescript
import { makeS3Client, s3, S3ClientTag } from "./generated/s3.js";
import { Effect, Layer } from "effect";

// Create or update bucket tag
const createBucketOrUpdateTag = Effect.gen(function* () {
  const bucketName = "hello-effect";

  const updateTag = 
    s3("put_bucket_tagging", { 
      Bucket: bucketName,
      Tagging: {
        TagSet: [
          { Key: "triedToCreate", Value: new Date().toISOString() }
        ]
      }
    }).pipe(
      Effect.orDie
    );

  return yield* (
    s3("create_bucket", { Bucket: bucketName }).pipe(
      Effect.catchIf(error => error.is("BucketAlreadyExists"), () => updateTag),
      Effect.catchIf(error => error.is("BucketAlreadyOwnedByYou"), () => updateTag)
    )
  );
});

// Run the effect
createBucketOrUpdateTag.pipe(
  Effect.provideServiceEffect(S3ClientTag, makeS3Client({})),
  Effect.runPromise
).finally(() => {
  console.info("done");
});
```

## Getting started

### Install this package

You can install this package either locally or globally
```bash
npm i -D @effect-ak/aws-sdk
# or
npm i -g @effect-ak/aws-sdk
```

### Install AWS SDK Clients

> The generated code depends on `@aws-sdk/client-*` packages, so they must be installed in `node_modules`.

**Example:**
```json
"devDependencies": {
  "@aws-sdk/client-s3": "3.709.0"
}
```

### Setup generator configuration [Optional]

Create a file named `aws-sdk.json` with the following structure:

```json
{
  "generate_to": "example/generated", // Specifies where to place generated files
  "clients": ["lambda"] // Specifies which clients to generate (all available in node_modules by default)
}
```

### Run Generation

```bash
# If @effect-ak/aws-sdk is installed locally
./node_modules/.bin/gen-aws-sdk

# If installed globally
gen-aws-sdk
```

## A Little Story

The AWS SDK also generates `@aws-sdk/client-*` libraries. They have their own project for this: [Smithy](https://smithy.io/2.0/index.html).

There is a specification for each service: [AWS SDK JS V3 Codegen Models](https://github.com/aws/aws-sdk-js-v3/tree/main/codegen/sdk-codegen/aws-models).

I thought about writing my own generator that would parse the JSON specification, but it turned out to be easier to write a wrapper for the generated code.
