import type { ScannedSdk } from "#/scan-sdk/_model.js";
import type { TypeNames, TypescriptSourceFile } from "#/type.js";

export const writeResultPart = (
  { exceptionClass, getExceptions }: ScannedSdk,
  { allExceptions, exceptionName, clientName, clientApiInterface }: TypeNames,
  out: TypescriptSourceFile
) => {

  out.addFunction({
    isExported: true,
    name: `is${clientName}ExpectedError`,
    typeParameters: [
      {
        name: "M",
        constraint: `keyof ${clientApiInterface}`
      },
      {
        name: "E",
        constraint: `${exceptionName}`
      },
    ],
    parameters: [
      {
        name: "result",
        type: "ActionResult<M, E>"
      },
      {
        name: "error",
        type: `${exceptionName}`
      },
    ],
    statements: `
      if (result._tag != "ExpectedError") return false;

      return result.error.name == error
    `
  }).formatText();

  out.addStatements(writer => {
    writer.blankLine();
    writer.write(`export class ${clientName}Success<M extends keyof ${clientApiInterface}> `).inlineBlock(() => {
      writer.writeLine(`readonly _tag = "Success";`)
      writer.writeLine(`constructor(readonly success: ReturnType<${clientApiInterface}[M]>) { }`)
    })
  });

  out.addStatements(writer =>
    writer.write(`export class ${clientName}ExpectedError<E extends ${exceptionName}> `).inlineBlock(() => {
      writer.writeLine(`readonly _tag = "ExpectedError";`)
      writer.writeLine(`constructor(readonly error: ${exceptionClass.getName()} & { name: E }) { }`)
    })
  );

  out.addStatements(writer => 
    writer.write(`export class ${clientName}UnexpectedError `).inlineBlock(() => {
      writer.writeLine(`readonly _tag = "UnexpectedError";`)
      writer.writeLine(`constructor(readonly error: unknown) { }`)
    })
  );

  out.addTypeAlias({
    name: "ActionResult",
    typeParameters: [
      {
        name: "M",
        constraint: `keyof ${clientApiInterface}`
      },
      {
        name: "E",
        constraint: `${exceptionName}`
      },
    ],
    type: `${clientName}Success<M> | ${clientName}ExpectedError<E> | ${clientName}UnexpectedError`
  })

  const exceptions = getExceptions();

  out.addStatements(writer => {
    writer.blankLine();
    writer.writeLine(`const ${allExceptions} = [`);

    let caret = 0;

    for (const exception of exceptions) {
      if (exception.className.endsWith("ServiceException")) continue;
      if (caret == 0) writer.write("  ");
      writer.write(`"${exception.className}"`);
      writer.write(", ");
      if (caret == 2) {
        caret = 0;
        writer.write("\n");
      } else {
        caret += 1;
      }
    }

    writer.writeLine("] as const;");

  });

  out.addTypeAlias({
    name: exceptionName,
    type: `typeof ${allExceptions}[number]`,
    isExported: true
  });

}
