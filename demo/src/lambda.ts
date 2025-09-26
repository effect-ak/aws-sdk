import { Effect } from "effect";
import { readFile } from "fs/promises";
import { lambda, LambdaClient } from "./effect-aws-sdk/lambda";
import { IAMClient } from "./effect-aws-sdk/iam";
import { getOrCreateRole } from "./iam";

const createFunctionUpdateCode =
  Effect.gen(function* () {

    const code = yield* Effect.tryPromise(() => readFile("example.zip"));

    const fnName = "hello-effect";
    const role = yield* getOrCreateRole(
      'Function1',
      "lambda.amazonaws.com"
    )

    yield* lambda("create_function", {
      Role: role,
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

/**
 * Running module
 */
createFunctionUpdateCode.pipe(
  Effect.provide([
    LambdaClient.Default(),
    IAMClient.Default()
  ]),
  Effect.runPromise
).finally(() => {
  console.info("done")
});
