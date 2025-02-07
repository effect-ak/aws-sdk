[![NPM Version](https://img.shields.io/npm/v/%40effect-ak%2Faws-sdk)](https://www.npmjs.com/package/@effect-ak/aws-sdk)
![NPM Downloads](https://img.shields.io/npm/dw/%40effect-ak%2Faws-sdk)

## Motivation

AWS SDK libraries are not convenient to use because they rely on Promises, which do not describe possible errors.

This tool generates wrapper code for AWS SDK, making it easier to work with [Effect](https://effect.website).

[Effect Error Management](https://effect.website/docs/error-management/expected-errors/)

## Usage Example

The `createBucketOrUpdateTag` function creates an S3 bucket.

If AWS S3 returns an error indicating that the bucket already exists, the function updates the `triedToCreate` tag with the current date and time.

This example doesn't have a real-world use case but showcases how a complex workflow can be built based on expected errors.

> More practical example can be found [here](https://github.com/kondaurovDev/effect-tg-bot/tree/main/scripts/deploy)

```typescript
import { Effect } from "effect";
import { s3 } from "./generated/s3.js";

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

Create a file named `aws-sdk.json` and define generator config:

```json
{
  "$schema": "https://esm.sh/@effect-ak/aws-sdk@0.2.0/dist/schema.json"
}
```

### Run Generation

```bash
# If @effect-ak/aws-sdk is installed locally
./node_modules/.bin/gen-aws-sdk

# If installed globally
gen-aws-sdk
```

### AWS SDK libraries are generated as well

The AWS SDK also generates `@aws-sdk/client-*` libraries. They have their own project for this: [Smithy](https://smithy.io/2.0/index.html).

There is a specification for each service: [AWS SDK JS V3 Codegen Models](https://github.com/aws/aws-sdk-js-v3/tree/main/codegen/sdk-codegen/aws-models).

> I thought about writing my own generator that would parse the JSON specification, but it turned out to be easier to write a wrapper for the generated code.
