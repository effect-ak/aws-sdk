import { pipe, String, Array, Option, Order } from "effect";
import type { ScannedSdkShape } from "./_model.js";
import { makePrettyOperationName } from "#/util/text.js";

const cache = new Map<string, ReturnType<typeof get>>();

const throwsRegex = /@throws\s+\{@link\s+([^}]+)\}/g;

export function getCommands(
  input: Pick<ScannedSdkShape, "sdkName" | "classes">
) {

  if (cache.has(input.sdkName)) {
    return cache.get(input.sdkName)!
  }

  const result = get(input);
  cache.set(input.sdkName, result);
  return result;

}

const get = (
  input: Pick<ScannedSdkShape, "classes">
) =>
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
