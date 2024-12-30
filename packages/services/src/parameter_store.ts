import { ssm } from "./clients/index.js";
import { Data, Effect, Schema as S } from "effect";
import { parse as parseToml } from "smol-toml"

export class InvalidParameterError extends Data.TaggedError('InvalidParameterError')<{
  path: string
  reason: 'not_found' | 'invalid_toml' | 'schema_mismatch'
  error?: unknown
}>{}

type ReadConfig<I> = {
  path: string
  configSchema: S.Schema<I>
}

export const getConfigFromParameterStore =
  Effect.fn('get config from parameter store')(<I>({
    path, configSchema
  }: ReadConfig<I>) =>
    ssm.make("get_parameter", {
      Name: path,
      WithDecryption: true
    }).pipe(
      Effect.andThen(_ => _.Parameter?.Value),
      Effect.filterOrFail(
        (value): value is string => value != null,
        () => new InvalidParameterError({ path, reason: 'not_found' })
      ),
      Effect.andThen(raw =>
        Effect.try({
          try: () => parseToml(raw),
          catch: (error) => new InvalidParameterError({ path, reason: 'invalid_toml', error })
        })
      ),
      Effect.andThen(S.decodeUnknown(configSchema)),
      Effect.catchTag("ParseError", (error) =>
        Effect.fail(new InvalidParameterError({ path, reason: 'schema_mismatch', error }))
      )
    ))
