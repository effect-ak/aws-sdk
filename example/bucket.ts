import { Effect } from "effect";
import { s3 } from "./generated/s3.js";

const getBucketOrUpdateTag =
  Effect.gen(function* () {

    const bucketName = "hello-effect-2";

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
  Effect.runPromise
).finally(() => {
  console.info("done")
});
