import { Schema as S } from "effect";

export type ClientDefauts = typeof MainConfigSchema.Type.client_defaults

export const MainConfigSchema =
  S.Struct({
    $schema: S.NonEmptyString,
    generate_to:
      S.propertySignature(S.String).annotations({
        title: "Generate to",
        description: "Generated files will be created here",
        default: "src/generated"
      }),
    clients:
      S.propertySignature(S.NonEmptyArray(S.NonEmptyString)).annotations({
        title: "Clients",
        description: "Generate only these clients",
      }),
    client_defaults: 
      S.Struct({
        region: S.NonEmptyString
      }).pipe(
        S.partial
      )
  }).pipe(S.partial);

export const PackageJsonSchema =
  S.Struct({
    dependencies: S.Record({ key: S.NonEmptyString, value: S.Unknown }),
    devDependencies: S.Record({ key: S.NonEmptyString, value: S.Unknown }),
  }).pipe(S.partial);
