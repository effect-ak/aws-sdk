import { makeS3Client, s3, S3ClientTag } from "./generated/s3.js";

import { Effect, Layer } from "effect";

const live =
  Layer.mergeAll(
    Layer.effect(S3ClientTag, makeS3Client({})),
  );

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

getBucketOrUpdateTag.pipe(
  Effect.provide(live),
  Effect.runPromise
).finally(() => {
  console.info("done")
});
