import { Effect, pipe } from "effect";
import { readFile } from "fs/promises";
import { lambda, LambdaClient } from "./effect-aws-sdk/lambda";
import { iam, IAMClient } from "./effect-aws-sdk/iam";

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
  Effect.provide([
    LambdaClient.Default(),
    IAMClient.Default()
  ]),
  Effect.runPromise
).finally(() => {
  console.info("done")
});
