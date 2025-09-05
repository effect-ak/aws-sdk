import { Effect } from "effect";
import { s3, S3Client } from "./effect-aws-sdk/s3";

const bucketName = "effect-aws-sdk-gen-demo"

const s3_actions =
  Effect.gen(function* () {

    const client = yield* S3Client

    const update_bucket_tag_effect =
      s3("put_bucket_tagging", {
        Bucket: bucketName,
        Tagging: {
          TagSet: [
            { Key: "date", Value: new Date().toISOString() }
          ]
        }
      }).pipe(
        Effect.provideService(S3Client, client)
      )

    const create_bucket_effect =
      s3("create_bucket", {
        Bucket: bucketName
      }).pipe(
        Effect.provideService(S3Client, client),
      )

    return {
      update_bucket_tag_effect,
      create_bucket_effect
    } as const

  })

const program =
  Effect.gen(function* () {

    const { create_bucket_effect, update_bucket_tag_effect } = yield* s3_actions
    return yield* (
      create_bucket_effect.pipe(
        Effect.catchIf(_ => _.$is("BucketAlreadyExists"), () => update_bucket_tag_effect),
        Effect.catchIf(_ => _.is("BucketAlreadyOwnedByYou"), () => update_bucket_tag_effect)
      )
    );
  })

program.pipe(
  Effect.provide(S3Client.Default()),
  Effect.runPromise
).finally(() => {
  console.info("done")
});
