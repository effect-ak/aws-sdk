import { lambda } from "./generated/lambda.js";
import { iam } from "./generated/iam.js";
import { readFile } from "fs/promises";
import { Effect, pipe } from "effect";

const getRole = 
  Effect.gen(function* () {

    const existing =
      yield* pipe(
        iam("get_role", { RoleName: "Function1" }),
        Effect.andThen(_ => _.Role),
        Effect.catchIf(_ => _.$is("NoSuchEntityException"), () => {

          const create =
            iam("create_role", {
              RoleName: "Function1",
              AssumeRolePolicyDocument: JSON.stringify({
                "Version": "2012-10-17",
                "Statement": [
                  {
                    "Effect": "Allow",
                    "Principal": {
                      "Service": "lambda.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                  }
                ]
              })
            }).pipe(
              Effect.andThen(_ => _.Role)
            );

          return create;

        }),
        Effect.andThen(_ => _?.Arn),
        Effect.filterOrFail(_ => _ != null),
      );

    return existing;

  });

const createFunction =
  Effect.gen(function* () {

    const code = yield* Effect.tryPromise(() => readFile("example.zip"));

    const fnName = "hello-effect";

    const fn = yield* lambda("create_function", {
      Role: yield* getRole,
      Code: {
        ZipFile: code
      },
      Runtime: "nodejs22.x",
      FunctionName: fnName,
      Handler: "index.handler"
    }).pipe(
      Effect.catchIf(_ => _.$is("ResourceConflictException"), () =>
        lambda("update_function_code", {
          FunctionName: fnName,
          ZipFile: code
        })
      )
    );

  }).pipe(
    Effect.tapBoth({
      onSuccess: () => Effect.logInfo("created"),
      onFailure: (error) => Effect.logError("Error", error)
    })
  )

createFunction.pipe(
  Effect.runPromise
).finally(() => {
  console.info("done")
});
