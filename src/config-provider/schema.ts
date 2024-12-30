import { Schema as S } from "effect";

export const GenerateConfigSchema =
  S.Struct({
    generate_to:
      S.propertySignature(S.String).annotations({
        title: "Generate to",
        description: "Generated files will be created here",
        default: "src/generated"
      }),
    clients:
      S.propertySignature(S.NonEmptyArray(S.String)).annotations({
        title: "Clients",
        description: "Generate only these clients",
      }),
  }).pipe(S.partial);

export const PackageJsonSchema =
  S.Struct({
    dependencies: S.Record({ key: S.NonEmptyString, value: S.Unknown }),
    devDependencies: S.Record({ key: S.NonEmptyString, value: S.Unknown }),
  }).pipe(S.partial);
