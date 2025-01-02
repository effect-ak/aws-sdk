import type { ScannedSdk } from "#/scan-sdk/_model.js";
import type { TypeNames, TypescriptSourceFile } from "#/type.js";
import { VariableDeclarationKind } from "ts-morph";

export const writeErrorPart = (
  { getExceptions }: ScannedSdk,
  { clientName }: TypeNames,
  out: TypescriptSourceFile
) => {

  const exceptions = getExceptions();

  out.addClass({
    isExported: true,
    name: `${clientName}UnknownError`,
    properties: [
      {
        isReadonly: true,
        name: "_tag",
        initializer: `"${clientName}UnknownError"`
      }
    ],
    ctors: [
      {
        parameters: [
          {
            isReadonly: true,
            name: "cause",
            type: `unknown`
          }
        ]
      }
    ]
  }).formatText({ indentSize: 2 });

  for (const exception of exceptions) {
    let errorName = exception.props.find(_ => _.name == "name")?.type;
    errorName = errorName?.replace("Exception", "");

    if (!errorName) continue;

    let name = `${clientName}${errorName}`;

    if (!name.endsWith("Error")) name = `${name}Error`;
    
    out.addClass({
      isExported: true,
      name,
      properties: [
        {
          isReadonly: true,
          name: "_tag",
          initializer: `"${clientName}${errorName}"`
        }
      ],
      ctors: [
        {
          parameters: [
            {
              isReadonly: true,
              name: "cause",
              type: `Sdk.${exception.className}`
            }
          ]
        }
      ]
    }).formatText({ indentSize: 2 });

  };

  out.addTypeAlias({
    name: "AllErrorKeys",
    type: "keyof typeof allErrors"
  });

  out.addFunction({
    name: "isErrorKey",
    parameters: [
      {
        name: "input",
        type: "string"
      }
    ],
    returnType: "input is AllErrorKeys",
    statements: "return input in allErrors"
  });

  out.addTypeAlias({
    name: "AllErrors",
    type: "InstanceType<typeof allErrors[keyof typeof allErrors]>"
  });

  out.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "allErrors",
        initializer: writer =>
          writer.inlineBlock(() => {
            for (const exception of exceptions) {
              const errorName = 
                exception.baseName.startsWith(clientName) ?
                `${exception.baseName}Error` :
                `${clientName}${exception.baseName}Error`;

              writer.writeLine(`${exception.className}: ${errorName},`)
            }
          })
      }
    ]
  }).formatText({ indentSize: 2 });

}
