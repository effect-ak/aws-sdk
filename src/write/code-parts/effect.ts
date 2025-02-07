import type { ClientDefauts } from "#/config-provider/schema";
import type { ScannedSdk } from "#/scan-sdk/_model.js";
import type { TypeNames, TypescriptSourceFile } from "#/type.js";

export const writeEffectPart = (
  { configInterface, sdkName }: ScannedSdk,
  { clientName, clientApiInterface, commandsFactory }: TypeNames,
  clientDefaults: ClientDefauts,
  out: TypescriptSourceFile,
) => {

  const makeClientFunctionName = `make${clientName}Client`;

  out.addFunction({
    isExported: true,
    name: makeClientFunctionName,
    parameters: [
      {
        name: "config",
        type: `Sdk.${configInterface.getName()}`
      }
    ],
    statements: `
      return Micro.try({
        try: () => new _SdkClient(config),
        catch: _ => _
      }).pipe(
        Micro.orDie
      )
    `
  }).formatText({
    indentSize: 2
  });

  out.addClass({
    isExported: true,
    name: `${clientName}Client`,
    extends: `
      Context.Reference<${clientName}Client>()(
          "${clientName}Client",
          {
            defaultValue() {
              return ${makeClientFunctionName}(${JSON.stringify(clientDefaults, undefined, 2)}).pipe(Micro.runSync);
            }
          }
        )
    `
  }).formatText();

  out.addFunction({
    isExported: true,
    name: sdkName.replace("-", "_"),
    typeParameters: [
      {
        name: "M",
        constraint: `keyof ${clientApiInterface}`
      }
    ],
    parameters: [
      {
        name: "actionName",
        type: "M"
      },
      {
        name: "actionInput",
        type: `${clientApiInterface}[M][0]`
      }
    ],
    statements: `
      return Micro.gen(function* () {

        const client = yield* Micro.service(${clientName}Client);

        const command = new ${commandsFactory}[actionName](actionInput);

        return yield* Micro.tryPromise({
          try: () => {
            console.debug("${clientName}", { actionName });
            return client.send(command) as Promise<${clientApiInterface}[M][1]>
          },
          catch: error => {
            if (error instanceof _ServiceBaseError) {
              return new ${clientName}Error(error, actionName);
            } else {
              return { _tag: "#Defect", error } as const;
            }
          }
        }).pipe(
          Micro.catchTag("#Defect", _ => Micro.die(_)),
          Micro.tap((result) => {
            console.debug("${clientName}, success", {
              actionName,
              statusCode: result.$metadata.httpStatusCode
            });
          }),
          Micro.tapError(error => {
            console.debug("${clientName}, error", {
              actionName,
              name: error.cause.name,
              message: error.cause.message,
              statusCode: error.cause.$metadata.httpStatusCode
            });
            return Micro.void;
          })
        );

      })
    `
  }).formatText();

}
