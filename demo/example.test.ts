import { Effect } from "effect";
import { s3, S3Client } from "demo/effect-aws-sdk/s3";
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
        Effect.provide([
          S3Client.Default()
        ]),
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
        Effect.provide([
          S3Client.Default()
        ]),
        Effect.runPromiseExit
      );

    assert(program._tag == "Success");

  });

})