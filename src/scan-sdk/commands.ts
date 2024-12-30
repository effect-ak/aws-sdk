import { pipe, String, Array, Option, Order } from "effect";
import type { ScannedSdkShape } from "./_model.js";

const cache = new Map<string, ReturnType<typeof get>>();

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
      const methodName =
        pipe(
          String.uncapitalize(originName),
          String.camelToSnake
        );
      return Option.some({
        methodName, originName,
        inputClassName: String.snakeToPascal(originName)
      });
    }),
    Array.dedupeWith((a, b) => a.methodName == b.methodName),
    Array.sortWith(_ => _.methodName, Order.string),
    Array.take(10)
  );
