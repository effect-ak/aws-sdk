import { Effect, Array, pipe, Option } from "effect";
import { IndentationText, Project, VariableDeclarationKind } from "ts-morph";

import type { ScannedSdk, ScannedSdkShape } from "~/scan";
import { ConfigProviderService, type MainConfig } from "~/config";
import type { TypescriptSourceFile } from "~/type";

type TypeNames = ReturnType<typeof getTypeNames>;

const getTypeNames = (
  input: Pick<ScannedSdkShape, "clientClass">
) => {

  const clientName = input.clientClass.getName()!.slice(0, "client".length * -1);

  return {
    clientName,
    clientApiInterface: `${clientName}Api`,
    commandsFactory: `${clientName}CommandFactory`,
    exceptionClassName: `${clientName}Exception`
  } as const;

}

const writeHeadPart = (
  { sdkName }: ScannedSdk,
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
      namespaceImport: "Sdk",
      moduleSpecifier: `@aws-sdk/client-${sdkName}`,
    },
    {
      namedImports: ["AllErrors"],
      isTypeOnly: true,
      moduleSpecifier: `./internal/utils.js`,
    },
  ]);

}

const writeEffectPart = (
  { configInterface, sdkName, clientClass, exceptionClass }: ScannedSdk,
  { clientName, clientApiInterface, commandsFactory }: TypeNames,
  clientDefaults: MainConfig['global'],
  out: TypescriptSourceFile,
) => {

  const classClientName = `${clientName}Client`
  const sdkClientName = clientClass.getName()
  const sdkExceptionName = exceptionClass.getName()

  out.addStatements(`
    export class ${classClientName} extends Context.Tag('${classClientName}')<${classClientName}, Sdk.${sdkClientName}> () {

      static Default = (
        config?: Sdk.${configInterface.getName()}
      ) =>
        Layer.effect(
          ${classClientName},
          Effect.gen(function* () {
            return new Sdk.${sdkClientName}(${clientDefaults?.region ? `{ region: "${clientDefaults.region}", ...config } as Sdk.${configInterface.getName()}` : 'config ?? {}'})
          })
        )
    }
  `).forEach(_ => _.formatText())

  out.addStatements(`
    /**
     * Creates an Effect that executes an AWS ${clientName} command.
     *
     * @param actionName - The name of the ${clientName} command to execute
     * @param actionInput - The input parameters for the command
     * @returns An Effect that will execute the command and return its output
     *
     * @example
     * \`\`\`typescript
     * import { ${sdkName.replaceAll("-", "_")} } from "@effect-ak/aws-sdk"
     *
     * const program = Effect.gen(function*() {
     *   const result = yield* ${sdkName.replaceAll("-", "_")}.make("command_name", {
     *     // command input parameters
     *   })
     *   return result
     * })
     * \`\`\`
     */
    export const make =
      Effect.fn('aws_${clientName}')(function* <M extends keyof ${clientApiInterface}>(
        actionName: M, actionInput: ${clientApiInterface}[M][0]
      ) {
        yield* Effect.logDebug(\`aws_${clientName}.\${actionName}\`, { input: actionInput })

        const client = yield* ${classClientName}
        const command = new ${commandsFactory}[actionName](actionInput) as Parameters<typeof client.send>[0]

        const result = yield* Effect.tryPromise({
          try: () => client.send(command) as Promise<${clientApiInterface}[M][1]>,
          catch: (error) => {
            if (error instanceof Sdk.${sdkExceptionName}) {
              return new ${clientName}Error(error, actionName)
            }
            throw error
          }
        })

        yield* Effect.logDebug(\`aws_${clientName}.\${actionName} completed\`)

        return result
      })
  `).forEach(_ => _.formatText())

}

const writeErrorPart = (
  { exceptionClass }: ScannedSdk,
  { clientName, clientApiInterface }: TypeNames,
  out: TypescriptSourceFile
) => {

  const sdkExceptionName = exceptionClass.getName()

  out.addStatements(`
    export class ${clientName}Error<C extends keyof ${clientApiInterface}> {
      readonly _tag = "${clientName}Error";

      constructor(
        readonly cause: Sdk.${sdkExceptionName},
        readonly command: C
      ) {}

      $is<N extends keyof ${clientName}Api[C][2]>(
        name: N
      ): this is ${clientName}Error<C> {
        return this.cause.name == name;
      }

      is<N extends keyof AllErrors<${clientApiInterface}>>(
        name: N
      ): this is ${clientName}Error<C> {
        return this.cause.name == name;
      }

    }
  `).at(0)?.formatText();

}

const writeSdkPart = (
  { getCommands, getExceptions, sdkName }: ScannedSdk,
  { clientName, clientApiInterface, commandsFactory }: TypeNames,
  out: TypescriptSourceFile
) => {

  const commands = getCommands();
  const exceptionNames = new Set(getExceptions().map(_ => _.className));

  out.addTypeAlias({
    isExported: true,
    name: `${clientName}MethodInput<M extends keyof ${clientApiInterface}>`,
    type: `${clientApiInterface}[M][0]`
  });

  out.addTypeAlias({
    isExported: false,
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
    isExported: false,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: commandsFactory,
        type: `{ [M in keyof ${clientApiInterface}]: new (args: ${clientApiInterface}[M][0]) => unknown }`,
        initializer: writer =>
          writer.inlineBlock(() => {
            for (const cmd of commands) {
              writer.writeLine(`${cmd.methodName}: Sdk.${cmd.originName}Command,`)
            }
          })
      }
    ]
  }).formatText({ indentSize: 2 });

}

export class WriteService
  extends Effect.Service<WriteService>()("WriteService", {
    effect:
      Effect.gen(function* () {

        const { generate_to, global } = yield* ConfigProviderService;

        const project =
          new Project({
            manipulationSettings: {
              indentationText: IndentationText.TwoSpaces
            }
          });

        const writeCode = (
          scannedSdk: ScannedSdk
        ) =>
          Effect.try(() => {

            const out = project.createSourceFile(
              `${generate_to}/${scannedSdk.sdkName}.ts`,
              `// *****  GENERATED CODE *****\n\n\n`,
              { overwrite: true }
            );
            const typeNames = getTypeNames(scannedSdk);

            writeHeadPart(scannedSdk, out);
            writeEffectPart(scannedSdk, typeNames, global, out);
            writeErrorPart(scannedSdk, typeNames, out);
            writeSdkPart(scannedSdk, typeNames, out);

            return out;

          });

        const writeIndex = (
          scannedSdks: ScannedSdk[]
        ) =>
          Effect.try(() => {
            const out = project.createSourceFile(
              `${generate_to}/index.ts`,
              `// *****  GENERATED CODE *****\n\n`,
              { overwrite: true }
            );

            // Add Layer import
            out.addImportDeclaration({
              namespaceImport: "Layer",
              moduleSpecifier: "effect/Layer"
            });

            // Add AWS SDK type imports for makeClients
            for (const sdk of scannedSdks) {
              const configTypeName = sdk.configInterface.getName();
              out.addImportDeclaration({
                isTypeOnly: true,
                namedImports: [configTypeName],
                moduleSpecifier: `@aws-sdk/client-${sdk.sdkName}`
              });
            }

            // Import all client modules as namespaces (for internal use)
            for (const sdk of scannedSdks) {
              const namespaceName = sdk.sdkName.replaceAll("-", "_");
              out.addImportDeclaration({
                namespaceImport: namespaceName,
                moduleSpecifier: `./${sdk.sdkName}.js`
              });
            }

            out.addStatements("\n");

            // Re-export all namespaces
            for (const sdk of scannedSdks) {
              const namespaceName = sdk.sdkName.replaceAll("-", "_");
              out.addStatements(`export { ${namespaceName} };`);
            }

            out.addStatements("\n");

            // Generate AllClientsDefault
            const layersList = scannedSdks.map(sdk => {
              const namespaceName = sdk.sdkName.replaceAll("-", "_");
              const clientName = sdk.clientClass.getName()!.slice(0, "client".length * -1);
              return `${namespaceName}.${clientName}Client.Default()`;
            }).join(",\n  ");

            out.addStatements(`
              export const AllClientsDefault = Layer.mergeAll(
                ${layersList}
              );
            `).forEach(_ => _.formatText());

            // Generate makeClients config type
            const configTypeFields = scannedSdks.map(sdk => {
              const namespaceName = sdk.sdkName.replaceAll("-", "_");
              const configTypeName = sdk.configInterface.getName();
              return `${namespaceName}?: ${configTypeName}`;
            }).join(",\n  ");

            // Generate makeClients function
            const makeClientsLayers = scannedSdks.map(sdk => {
              const namespaceName = sdk.sdkName.replaceAll("-", "_");
              const clientName = sdk.clientClass.getName()!.slice(0, "client".length * -1);
              return `${namespaceName}.${clientName}Client.Default(config?.${namespaceName})`;
            }).join(",\n  ");

            out.addStatements(`
              export const makeClients = (config?: {
                ${configTypeFields}
              }) => Layer.mergeAll(
                ${makeClientsLayers}
              );
            `).forEach(_ => _.formatText());

            return out;
          });

        const writeInternalUtils =
          Effect.try(() => {
            const out = project.createSourceFile(
              `${generate_to}/internal/utils.ts`,
              `// *****  GENERATED CODE *****\n\n`,
              { overwrite: true }
            );

            out.addStatements(`
              type UnionToIntersection<U> =
                (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

              export type AllErrors<Api extends Record<string, [unknown, unknown, Record<string, unknown> | never]>> =
                UnionToIntersection<{
                  [C in keyof Api]: Api[C][2] extends never ? {} : {
                    [E in keyof Api[C][2]]: Api[C][2][E]
                  }
                }[keyof Api]> extends infer I ? { [K in keyof I]: I[K] } : never;
            `).forEach(_ => _.formatText());

            return out;
          });

        const save =
          Effect.promise(() => project.save());

        return {
          writeCode,
          writeIndex,
          writeInternalUtils,
          save,
          project
        }

      }),

    dependencies: [
      ConfigProviderService.Default
    ]

  }) { }
