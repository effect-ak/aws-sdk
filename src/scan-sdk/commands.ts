import { pipe, String, Array, Option, Order } from "effect";
import type { ScannedSdkShape } from "./_model.js";
import { makePrettyOperationName } from "#/util/text.js";

const cache = new Map<string, ReturnType<typeof get>>();

const throwsRegex = /^\w*Exception/;

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
    Array.filterMap(input.classes, cls => {
      let originName = cls.getName();
      if (!originName?.endsWith("Command")) return Option.none();
      originName = originName.slice(0, originName.length - 7);
      const methodName = makePrettyOperationName(originName);
      const jsDocTags = cls.getJsDocs().flatMap(jsDoc => jsDoc.getTags());
      const exceptions = [] as string[];
      for (const doc of jsDocTags) {
        const match = doc.getCommentText()?.match(throwsRegex);
        if (match?.[0]) exceptions.push(match[0])
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
