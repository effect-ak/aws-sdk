import type { ScannedSdk } from "#/scan-sdk/_model.js";
import type { TypescriptSourceFile } from "#/type.js";

export const writeHeadPart = (
  { sdkName, getCommands, exceptionClass, clientClass }: ScannedSdk,
  out: TypescriptSourceFile
) => {

  out.addImportDeclarations([
    {
      namedImports: ["Context", "Micro"],
      moduleSpecifier: `effect`,
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
        writer.writeLine(`${clientClass.getName()} as _SdkClient, ${exceptionClass.getName()},`);
        for (const command of getCommands()) {
          writer.write(command.inputClassName + "Command")
          writer.write(", ");
          if (caret == 2) {
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
