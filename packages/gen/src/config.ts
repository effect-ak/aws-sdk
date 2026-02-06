import { Effect, pipe, Schema as S, Array, Option } from "effect";
import { readFile } from "fs/promises";

export class ConfigProviderService
  extends Effect.Service<ConfigProviderService>()("ConfigProviderService", {
    effect:
      Effect.gen(function* () {

        const { definedConfig, clientsInPackageJson } = yield* readConfiguration;

        if (clientsInPackageJson.length == 0) {
          yield* Effect.logWarning("No clients to generate");
        };

        const config = {
          generate_to: definedConfig.generate_to ?? "src/generated",
          clients: definedConfig.clients ?? clientsInPackageJson,
          global: definedConfig.global
        } as const;

        yield* Effect.logInfo("current config", config)

        return config;

      })

  }) { }

export const MainConfigSchema =
  S.Struct({
    $schema: S.NonEmptyString,
    generate_to:
      S.propertySignature(S.String).annotations({
        title: "Generate to",
        description: "Generated files will be created here",
        default: "src/effect-aws-sdk"
      }),
    clients:
      S.propertySignature(S.NonEmptyArray(S.NonEmptyString)).annotations({
        title: "Clients",
        description: "Generate only these clients",
      }),
    global:
      S.Struct({
        region: S.NonEmptyString
      })
  }).pipe(S.partial);

export type MainConfig = typeof MainConfigSchema.Type

const PackageJsonSchema =
  S.Struct({
    dependencies: S.Record({ key: S.NonEmptyString, value: S.Unknown }),
    devDependencies: S.Record({ key: S.NonEmptyString, value: S.Unknown }),
  }).pipe(S.partial);

const readConfiguration =
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
 