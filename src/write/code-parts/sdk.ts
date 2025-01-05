import { Array, pipe, Option } from "effect";
import { VariableDeclarationKind } from "ts-morph";

import type { ScannedSdk } from "#/scan-sdk/_model.js";
import type { TypeNames, TypescriptSourceFile } from "#/type.js";

export const writeSdkPart = (
  { getCommands, getExceptions, sdkName }: ScannedSdk,
  { clientName, clientApiInterface, commandsFactory }: TypeNames,
  out: TypescriptSourceFile
) => {

  const commands = getCommands();
  const exceptionNames = new Set(getExceptions().map(_ => _.className));

  console.log(sdkName, "exception names", exceptionNames);

  out.addTypeAlias({
    isExported: true,
    name: `${clientName}MethodInput<M extends keyof ${clientApiInterface}>`,
    type: `${clientApiInterface}[M][0]`
  });

  out.addTypeAlias({
    isExported: true,
    name: clientApiInterface,
    type: writer => {

      writer.inlineBlock(() => {

        for (const cmd of commands) {

          const replaceName = (name: string) =>
            name.startsWith(clientName) ?
              name.replace("Exception", "Error") :
              `${clientName}${name.replace("Exception", "Error")}`;

          const errors =
            pipe(
              Array.filterMap(cmd.throws, name => {
                if (!exceptionNames.has(name)) {
                  return Option.none()
                };
                return Option.some(replaceName(name).replace("ErrorError", "Error"))
              }),
              Array.dedupe
            );
            
          writer.writeLine(`${cmd.methodName}: [
            Sdk.${cmd.inputClassName}CommandInput,
            Sdk.${cmd.originName}CommandOutput,
            ${errors.length > 0 ? `[ \n${ errors.join(",\n") }\n ][number]`: "AllErrors" }
          ]`);

        }

      })

    }
  }).formatText({ indentSize: 2 });

  out.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: commandsFactory,
        type: `Record<keyof ${clientApiInterface}, new (args: any) => any>`,
        initializer: writer =>
          writer.inlineBlock(() => {
            for (const cmd of commands) {
              writer.writeLine(`${cmd.methodName}: ${cmd.originName}Command,`)
            }
          })
      }
    ]
  }).formatText({ indentSize: 2 });

}
