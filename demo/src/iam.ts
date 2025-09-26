import { Effect, pipe } from "effect";
import { iam } from "./effect-aws-sdk/iam";

const createRole =
  Effect.fn('create role')(function* (
    roleName: string,
    serviceName: string
  ) {
    iam("create_role", {
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Service": serviceName
            },
            "Action": "sts:AssumeRole"
          }
        ]
      })
    }).pipe(
      Effect.andThen(_ => _.Role)
    );
  })

export const getOrCreateRole =
  Effect.fn(function* (
    roleName: string,
    serviceName: string
  ) {

    const existing =
      yield* pipe(
        iam("get_role", { RoleName: roleName }),
        Effect.andThen(_ => _.Role),
        Effect.catchIf(_ => _.$is("NoSuchEntityException"), () =>
          createRole(roleName, serviceName)
        ),
        Effect.andThen(_ => _?.Arn),
        Effect.filterOrFail(_ => _ != null),
      );

    return existing;

  });
