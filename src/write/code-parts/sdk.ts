import type { ScannedSdk } from "#/scan-sdk/_model.js";
import type { TypeNames, InterfaceDeclaration, TypescriptSourceFile } from "#/type.js";
import { VariableDeclarationKind } from "ts-morph";

export const writeSdkPart = (
  { getCommands }: ScannedSdk,
  { clientName, clientApiInterface, commandsFactory }: TypeNames,
  out: TypescriptSourceFile
) => {

  const commands = getCommands();

  out.addTypeAlias({
    isExported: true,
    name: `${clientName}MethodInput<M extends keyof ${clientApiInterface}>`,
    type: `Parameters<${clientApiInterface}[M]>[0]`
  });

  out.addInterface({
    isExported: true,
    name: clientApiInterface,
    methods:
      commands.map(cmd => ({
        name: cmd.methodName,
        parameters: [{
          name: "_",
          type: `Sdk.${cmd.inputClassName}CommandInput`
        }],
        returnType: `Sdk.${cmd.originName}CommandOutput`
      }))
  } as InterfaceDeclaration);

  out.addVariableStatement({
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      { 
        name: commandsFactory,
        type: `Record<keyof ${clientApiInterface}, new (...args: any) => any>`,
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

