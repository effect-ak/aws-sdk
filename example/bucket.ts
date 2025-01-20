import { makeS3Client, s3, S3ClientTag } from "./generated/s3.js";

import { Effect } from "effect";

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
      }).pipe(
        Effect.orDie
      )

    return yield* (
      s3("create_bucket", { Bucket: bucketName  }).pipe(
        Effect.catchIf(_ => _.is("BucketAlreadyExists"), () => updateTag),
        Effect.catchIf(_ => _.is("BucketAlreadyOwnedByYou"), () => updateTag)
      )
    );

  });

getBucketOrUpdateTag.pipe(
  Effect.provideServiceEffect(S3ClientTag, makeS3Client({})),
  Effect.runPromise
).finally(() => {
  console.info("done")
});
