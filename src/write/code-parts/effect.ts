import type { ScannedSdk } from "#/scan-sdk/_model.js";
import type { TypeNames, TypescriptSourceFile } from "#/type.js";

export const writeEffectPart = (
  { configInterface, exceptionClass, sdkName }: ScannedSdk,
  { clientName, clientApiInterface, commandsFactory }: TypeNames,
  out: TypescriptSourceFile,
) => {

  out.addFunction({
    isExported: true,
    name: `make${clientName}Client`,
    parameters: [
      {
        name: "config",
        type: `Sdk.${configInterface.getName()}`
      }
    ],
    statements: `
      return Micro.try({
        try: () => new _SdkClient(config),
        catch: error => new ${clientName}UnknownError(error)
      })
    `
  }).formatText({
    indentSize: 2
  });

  out.addClass({
    isExported: true,
    name: `${clientName}ClientTag`,
    extends: `Context.Tag("${clientName}Client")<${clientName}ClientTag, _SdkClient>()`
  });

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

        const client = yield* Micro.service(${clientName}ClientTag);

        const command = new ${commandsFactory}[actionName](actionInput);

        return yield* Micro.tryPromise({
          try: () => {
            console.debug("${clientName}", { actionName });
            return client.send(command) as Promise<${clientApiInterface}[M][1]>
          },
          catch: error => {
            if (error instanceof ${exceptionClass.getName()}) {
              const key = error.name;
              if (isErrorKey(key)) {
                const errorConstructor = allErrors[key];
                return new errorConstructor(error as any) as ${clientApiInterface}[M][2];
              } else {
                return new ${clientName}UnknownError(error)
              }
            } else {
              return new ${clientName}UnknownError(error)
            }
          }
        }).pipe(
          Micro.tap(success => {
            console.debug("${clientName}", { success });
          }),
          Micro.tapError(error => {
            console.debug("${clientName}", { error });
            return Micro.void;
          })
        );

      })
    `
  }).formatText();

}
