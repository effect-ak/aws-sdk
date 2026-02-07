import { Data, pipe, String, Array, Option, Order, Effect, Context } from "effect";
import * as Morph from "ts-morph";

const isUpperCase = (input: string) =>
  input.toUpperCase() == input;

const toProperCase = (index: number, input: string) => {
  if (index == 0) return input[index];
  if (
    isUpperCase(input[index]) &&
    isUpperCase(input[index - 1]) &&
    (index == input.length - 1 || isUpperCase(input[index + 1]))
  ) return String.toLowerCase(input[index]);
  return input[index];
}

export const makeProperPascalCase = (str: string): string => {
  const letters: string[] = [];
  for (let i = 0; i < str.length; i++) {
    letters.push(toProperCase(i, str))
  }
  return letters.join("");
}

export const makePrettyOperationName = (input: string) =>
  pipe(
    makeProperPascalCase(input),
    String.pascalToSnake
  );

export class ScanConfig extends Context.Tag("ScanConfig")<ScanConfig, {
  readonly nodeModulesPath: string
}>() {
  static Default = Effect.succeed({ nodeModulesPath: "node_modules" })
}

export interface ScannedSdkShape {
  sdkName: string,
  classes: Morph.ClassDeclaration[],
  interfaces: Morph.InterfaceDeclaration[],
  clientClass: Morph.ClassDeclaration,
  exceptionClass: Morph.ClassDeclaration,
  configInterface: Morph.InterfaceDeclaration
}

export class ScannedSdk extends Data.Class<ScannedSdkShape> {

  static fromNodeModules = (client: string) =>
    Effect.gen(function* () {
      const { nodeModulesPath } = yield* ScanConfig;
      return yield* scanNodeModules(client, nodeModulesPath);
    }).pipe(
      Effect.provideServiceEffect(ScanConfig, ScanConfig.Default)
    );

  getCommands = () => getCommands(this);

  getExceptions = () => getExceptions(this);

}

const scanNodeModules = (
  clientName: string,
  nodeModulesPath: string
): Effect.Effect<ScannedSdk, string> =>
  Effect.gen(function* () {

    const sources = yield* Effect.try({
      try: () => {
        const project = new Morph.Project();
        return project.addSourceFilesAtPaths(`${nodeModulesPath}/@aws-sdk/client-${clientName}/**/*{.d.ts,.ts}`);
      },
      catch: (error) => {
        console.warn("sdk scanning error", error);
        return "InitProjectError" as const;
      }
    });

    const classes = sources.flatMap(_ => _.getClasses());
    const interfaces = sources.flatMap(_ => _.getInterfaces());

    const exceptionClass = classes.find(_ => _.getName()?.endsWith("ServiceException"));
    if (!exceptionClass) return yield* Effect.fail(`Exception class not found in ${clientName}`);

    const clientClass = classes.find(_ => _.getName()?.endsWith("Client"));
    if (!clientClass) return yield* Effect.fail("Client's class not found");

    const configInterface = interfaces.find(_ => _.getName()?.endsWith("ClientConfig"));
    if (!configInterface) return yield* Effect.fail("Client's config interface not found");

    return new ScannedSdk({
      sdkName: clientName, classes, interfaces, exceptionClass, configInterface, clientClass
    });

  });

const commandsCache = new Map<string, ReturnType<typeof extractCommands>>();
const throwsRegex = /@throws\s+\{@link\s+([^}]+)\}/g;

const getCommands = (input: Pick<ScannedSdkShape, "sdkName" | "classes">) => {
  if (commandsCache.has(input.sdkName)) {
    return commandsCache.get(input.sdkName)!
  }
  const result = extractCommands(input);
  commandsCache.set(input.sdkName, result);
  return result;
}

const extractCommands = (input: Pick<ScannedSdkShape, "classes">) =>
  pipe(
    input.classes,
    Array.filterMap(cls => {
      let originName = cls.getName();
      if (!originName?.endsWith("Command")) return Option.none();
      originName = originName.slice(0, originName.length - 7);
      const methodName = makePrettyOperationName(originName);
      const comment = cls.getLeadingCommentRanges().flatMap(_ => _.getText()).join("\n");
      const exceptions = [] as string[];
      const matched = comment.matchAll(throwsRegex);

      if (matched) {
        exceptions.push(...matched.map(_ => _.at(1)!));
      }

      return Option.some({
        methodName, originName,
        inputClassName: String.snakeToPascal(originName),
        throws: exceptions
      });
    }),
    Array.dedupeWith((a, b) => a.methodName == b.methodName),
    Array.sortWith(_ => _.methodName, Order.string)
  );

const exceptionsCache = new Map<string, ReturnType<typeof extractExceptions>>();

const getExceptions = (input: Pick<ScannedSdkShape, "sdkName" | "classes">) => {
  if (exceptionsCache.has(input.sdkName)) {
    return exceptionsCache.get(input.sdkName)!
  }
  const result = extractExceptions(input);
  exceptionsCache.set(input.sdkName, result);
  return result;
}

const extractExceptions = (input: Pick<ScannedSdkShape, "classes">) =>
  pipe(
    input.classes,
    Array.filterMap(cls => {
      const ext = cls.getExtends();
      if (!ext) return Option.none();
      const extendsFrom = ext.getExpression().getText();
      if (!extendsFrom.endsWith("Exception")) return Option.none();
      const className = cls.getName();
      if (!className) return Option.none();
      let baseName = className.replace("Exception", "");
      baseName = baseName.replace("Error", "");
      const props =
        Array.filterMap(cls.getProperties(), p => {
          if (p.getScope() != "public") return Option.none();
          const type = p.getType();
          return Option.some({
            name: p.getName(),
            type: type.isLiteral() ?
              type.getLiteralValue()?.toString() :
              type.getApparentType().getText(),
          })
        });

      return Option.some({ baseName, className, extendsFrom, props });
    }),
    Array.dedupeWith((a, b) => a.className == b.className)
  );
