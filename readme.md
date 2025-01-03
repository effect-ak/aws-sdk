[![NPM Version](https://img.shields.io/npm/v/%40effect-ak%2Faws-sdk)](https://www.npmjs.com/package/@effect-ak/aws-sdk)
![NPM Downloads](https://img.shields.io/npm/dw/%40effect-ak%2Faws-sdk)

## Usage

### Install aws-sdk dependencies

Install any @aws-sdk/client-* libraries into your project or skip it if you already have some

### Install this package

You can install this package either locally or globally
```
npm i -D @effect-ak/aws-sdk
// or
npm i -g @effect-ak/aws-sdk
```

### Setup config [Optional]

create file `aws-sdk.json` with following structure:
```
{
  "generate_to": "example/generated", // where to place generated files
  "clients": [ "lambda" ] // generate only these clients (all available by default)
}
```

### Run generation

```
//if @effect-ak/aws-sdk installed locally
./node-modules/.bin/gen-aws-sdk

//if installed globally
gen-aws-sdk
```

### Usage example

```typescript
import { makeS3Client, s3, S3ClientTag } from "./generated/s3.js";

import { Effect, Layer } from "effect";

// Create a layer with sdk clients
const live =
  Layer.mergeAll(
    Layer.effect(S3ClientTag, makeS3Client({})),
  );

// Use s3
const getBucketOrUpdateTag =
  Effect.gen(function* () {

    const bucketName = "hello-effect";

    const updateTag = 
      s3("put_bucket_tagging", { 
        Bucket: bucketName,
        Tagging: {
          TagSet: [
            { Key: "date", Value: new Date().toISOString() }
          ]
        }
      })

    return yield* (
      s3("create_bucket", { Bucket: bucketName  }).pipe(
        Effect.catchTags({
          S3BucketAlreadyExists: () => updateTag,
          S3BucketAlreadyOwnedByYou: () => updateTag
        })
      )
    );

  });

// Run effect
getBucketOrUpdateTag.pipe(
  Effect.provide(live),
  Effect.runPromise
).finally(() => {
  console.info("done")
});

```

## Motivation

I wanted to work with the AWS SDK using effects instead of promises. The main drawback of AWS SDK libraries that rely on promises is error handling. For example, when using the SDK to create a function that already exists, we might want to update the function's code instead of failing with an exception. Implementing such straightforward scenarios is very cumbersome with promises, whereas `effect-ts` allows you to seamlessly write complex workflows without increasing the complexity of understanding the code.

This library provides the following features:

- **Code Generation**: Generates wrapper clients that utilize effects (`effect-ts`).
- **Operation Discovery**: Identifies all available operations along with their input parameters and outputs.
- **Error Handling**: Detects all error classes and determines which methods throw which errors (as specified in JSDoc comments). This allows us to capture all expected errors and integrate them into the effect error channel.
