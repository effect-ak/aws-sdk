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

          const errors =
            pipe(
              cmd.throws,
              Array.filterMap(name => {
                if (!exceptionNames.has(name)) return Option.none();
                if (name.endsWith("ServiceException")) return Option.none();
                return Option.some(name)
              }),
              Array.dedupe
            );

          const errorsType =
            errors.length == 0 ? "never" : `{
              ${errors.map(e => `"${e}": Sdk.${e}`).join(",\n")}
            }`

          writer.writeLine(`${cmd.methodName}: [
            Sdk.${cmd.inputClassName}CommandInput,
            Sdk.${cmd.originName}CommandOutput,
            ${errorsType}
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
