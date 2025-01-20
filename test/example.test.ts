import { makeS3Client, s3, S3ClientTag } from "#example/generated/s3";
import { Effect } from "effect";
import { assert, describe, expect, it } from "vitest";

describe("s3", () => {

  it("catch error", async () => {

    const program = 
      await Effect.gen(function* () {

        const bucket = 
          yield* s3("put_object", {
            Bucket: "bla-bla-bla-123",
            Key: ""
          }).pipe(
            Effect.catchIf(_ => _.is("NotFound"), () => Effect.logInfo("Missing bucket"))
          );

      }).pipe(
        Effect.provideServiceEffect(S3ClientTag, makeS3Client({})),
        Effect.runPromiseExit
      );

    assert(program._tag == "Success");

  });

  it("put object if not exists", async () => {

    const program = 
      await Effect.gen(function* () {

        const bucket = 
          yield* s3("put_object", {
            Bucket: "kondaurovdev",
            Key: "a.temp",
            IfNoneMatch: "*",
            Body: "test"
          });
    
        expect(bucket).equals(true);

      }).pipe(
        Effect.catchIf(_ => _.cause.$metadata.httpStatusCode == 412, () => Effect.logInfo("already exists")),
        Effect.provideServiceEffect(S3ClientTag, makeS3Client({})),
        Effect.runPromiseExit
      );

    assert(program._tag == "Success");

  });

})