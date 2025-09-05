import { Effect, pipe, Schema as S, Array, Option } from "effect";
import { readFile } from "fs/promises";
import { MainConfigSchema, PackageJsonSchema } from "./schema";

export const readConfiguration =
  Effect.gen(function* () {

    const definedConfig =
      yield* pipe(
        readFileContent("aws-sdk.json"),
        Effect.andThen(_ => _ ?? "{}"),
        Effect.andThen(S.decodeUnknown(S.parseJson(MainConfigSchema)))
      );
    
    const packageJson =
      yield* pipe(
        readFileContent("package.json"),
        Effect.andThen(S.decodeUnknown(S.parseJson(PackageJsonSchema)))
      );

    const clientsInPackageJson = [
      ...(packageJson.dependencies ? getClientNames(Object.keys(packageJson.dependencies)) : []),
      ...(packageJson.devDependencies ? getClientNames(Object.keys(packageJson.devDependencies)) : []),
    ] as const;

    return {
      clientsInPackageJson,
      definedConfig
    };

  })

const clientPackagePrefix = "@aws-sdk/client-";

const getClientNames =
  (input: string[]) =>
    pipe(
      input,
      Array.filterMap(_ =>
        _.startsWith(clientPackagePrefix) ?
          Option.some(_.slice(clientPackagePrefix.length)) :
          Option.none()
      ),
      Array.dedupe
    );

const readFileContent =
  (fileName: string) =>
    pipe(
      Effect.tryPromise(() => readFile(fileName)),
      Effect.tapError((error) => 
        Effect.logDebug("reading file error", error)
      ),
      Effect.andThen(_ => _.toString("utf-8")),
      Effect.catchTag("UnknownException", () => Effect.succeed(undefined))
    );
