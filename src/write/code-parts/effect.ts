import type { MainConfig } from "~/config-provider/schema";
import type { ScannedSdk } from "~/scan-sdk/_model";
import type { TypeNames, TypescriptSourceFile } from "~/type";

export const writeEffectPart = (
  { configInterface, sdkName }: ScannedSdk,
  { clientName, clientApiInterface, commandsFactory }: TypeNames,
  clientDefaults: MainConfig['global'],
  out: TypescriptSourceFile,
) => {

  const classClientName = `${clientName}Client`

  out.addStatements(`
    export class ${classClientName} extends Context.Tag('${classClientName}')<${classClientName}, _SdkClient> () {
    
      static Default = (
        config?: Sdk.${configInterface.getName()}
      ) =>
        Layer.effect(
          ${classClientName},
          Effect.gen(function* () {
            return new _SdkClient({
              ${clientDefaults?.region ? `...{ region: "${clientDefaults.region}" },` : '...{},'}
              ...config
            })
          })
        )
    }
  `).forEach(_ => _.formatText())

  const mainFn = sdkName.replace("-", "_")

  out.addStatements(`
    export const ${mainFn} =
      Effect.fn('asw_${clientName}')(function* <M extends keyof ${clientApiInterface}>(
        actionName: M, actionInput: ${clientApiInterface}[M][0]
      ) {
        const client = yield* ${classClientName}
        const command = new ${commandsFactory}[actionName](actionInput)
        yield* Effect.logDebug(\`${clientName}_\${actionName}\`)
        return yield* Fn.pipe(
          Effect.tryPromise(() => client.send(command) as Promise<${clientApiInterface}[M][1]>),
          Effect.catchTag('UnknownException', (exception) => {
            if (exception.error instanceof _ServiceBaseError) {
              return Effect.fail(new ${clientName}Error(exception.error, actionName))
            } else {
              return Effect.die(exception.error)
            }
          }),
          Effect.tap(response => Effect.logDebug(\`${clientName}_\${actionName}\`, response))
        )
      })
  `).forEach(_ => _.formatText())

}
