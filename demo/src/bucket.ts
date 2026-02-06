import { Effect } from "effect";
import { s3 } from "./effect-aws-sdk";

const bucketName = "effect-aws-sdk-gen-demo";

/**
 * Demo: Ensure bucket exists and is properly tagged
 *
 * This example demonstrates:
 * - Idempotent operations (safe to run multiple times)
 * - Command-specific error handling with $is()
 * - Combining multiple AWS operations in a workflow
 */
const ensureBucket = Effect.gen(function* () {
  console.log(`🪣 Ensuring bucket exists: ${bucketName}`);

  // Try to create bucket
  yield* s3.make("create_bucket", {
    Bucket: bucketName
  }).pipe(
    Effect.tap(() => Effect.sync(() =>
      console.log("✅ Bucket created")
    )),
    Effect.catchIf(
      error => error.$is("BucketAlreadyExists"),
      () => Effect.sync(() => console.log("ℹ️  Bucket already exists, skipping creation"))
    ),
    Effect.catchIf(
      error => error.is("BucketAlreadyOwnedByYou"),
      () => Effect.sync(() => console.log("ℹ️  Bucket already owned by you, skipping creation"))
    )
  );

  // Apply tags (always, to ensure they're up to date)
  console.log("🏷️  Applying tags...");
  yield* s3.make("put_bucket_tagging", {
    Bucket: bucketName,
    Tagging: {
      TagSet: [
        { Key: "Environment", Value: "Demo" },
        { Key: "ManagedBy", Value: "Effect-AWS-SDK" },
        { Key: "LastUpdated", Value: new Date().toISOString() }
      ]
    }
  });

  // Verify by reading tags back
  const tags = yield* s3.make("get_bucket_tagging", {
    Bucket: bucketName
  });

  console.log("✅ Bucket ready with tags:", tags.TagSet);
  return tags;
});

// Run the program
ensureBucket.pipe(
  Effect.provide(s3.S3Client.Default()),
  Effect.runPromise
).then(
  () => console.log("🎉 Done!"),
  (error) => console.error("❌ Error:", error)
);
