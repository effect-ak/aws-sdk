import { Effect } from "effect";
import { ssm, makeClients } from "../../src/clients/index.js";

export const createSsmFixture = (region: string = "us-east-1") => {
  const clients = makeClients({ ssm: { region } });

  const putParameter = (name: string, value: string, type: "String" | "SecureString" = "String") =>
    Effect.gen(function* () {
      yield* ssm.make("put_parameter", {
        Name: name,
        Value: value,
        Type: type,
        Overwrite: true
      });
    }).pipe(
      Effect.provide(clients)
    );

  const deleteParameter = (name: string) =>
    Effect.gen(function* () {
      yield* ssm.make("delete_parameter", {
        Name: name
      });
    }).pipe(
      Effect.provide(clients),
      Effect.catchAll(() => Effect.void)
    );

  return {
    clients,
    putParameter,
    deleteParameter
  };
};
