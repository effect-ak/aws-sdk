import { makeS3Client, s3, S3ClientTag } from "#example/generated/s3";
import { Effect } from "effect";
import { assert, describe, expect, it } from "vitest";

describe("s3", () => {

  it("catch error", async () => {

    const program = 
      await Effect.gen(function* () {

        const bucket = 
          yield* s3("get_bucket_acl", {
            Bucket: "bla-bla-bla-123"
          }).pipe(
            Effect.catchAll(error => Effect.succeed(true))
          );
    
        expect(bucket).equals(true);

      }).pipe(
        Effect.provideServiceEffect(S3ClientTag, makeS3Client({})),
        Effect.runPromiseExit
      );

    assert(program._tag == "Success");

  })

})