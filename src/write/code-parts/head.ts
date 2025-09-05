import type { ScannedSdk } from "~/scan-sdk/_model";
import type { TypescriptSourceFile } from "~/type";

export const writeHeadPart = (
  { sdkName, getCommands, exceptionClass, clientClass }: ScannedSdk,
  out: TypescriptSourceFile
) => {

  out.addImportDeclarations([
    {
      namespaceImport: "Layer",
      moduleSpecifier: `effect/Layer`,
    },
    {
      namespaceImport: "Effect",
      moduleSpecifier: `effect/Effect`,
    },
    {
      namespaceImport: "Context",
      moduleSpecifier: `effect/Context`,
    },
    {
      namespaceImport: "Fn",
      moduleSpecifier: `effect/Function`,
    },
    {
      namespaceImport: "Sdk",
      isTypeOnly: true,
      moduleSpecifier: `@aws-sdk/client-${sdkName}`,
    },
    {
      namedImports: writer => {

        let caret = 0;
        writer.newLine();
        writer.writeLine(`${clientClass.getName()} as _SdkClient, ${exceptionClass.getName()} as _ServiceBaseError,`);
        for (const command of getCommands()) {
          writer.write(command.inputClassName + "Command")
          writer.write(", ");
          if (caret == 3) {
            caret = 0;
            writer.write("\n");
          }
          caret += 1;
        }
        writer.newLine();
      },
      moduleSpecifier: `@aws-sdk/client-${sdkName}`,
    }
  ]);

}
