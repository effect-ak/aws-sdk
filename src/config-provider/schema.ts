import { Schema as S } from "effect";

export type MainConfig = typeof MainConfigSchema.Type
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

export const PackageJsonSchema =
  S.Struct({
    dependencies: S.Record({ key: S.NonEmptyString, value: S.Unknown }),
    devDependencies: S.Record({ key: S.NonEmptyString, value: S.Unknown }),
  }).pipe(S.partial);
