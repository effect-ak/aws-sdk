import { pipe, Array, Option } from "effect";
import type { ScannedSdkShape } from "./_model.js";

const cache = new Map<string, ReturnType<typeof getFiltered>>();

export function getExceptions(
  input: Pick<ScannedSdkShape, "sdkName" | "classes">
) {

  if (cache.has(input.sdkName)) {
    return cache.get(input.sdkName)!
  }

  const result = getFiltered(input);
  cache.set(input.sdkName, result);
  return result;

}

const getFiltered = (
  input: Pick<ScannedSdkShape, "classes">
) =>
  pipe(
    Array.filterMap(input.classes, cls => {
      const ext = cls.getExtends();
      if (!ext) return Option.none();
      const extendsFrom = ext.getExpression().getText();
      if (!extendsFrom.endsWith("Exception")) return Option.none();
      const className = cls.getName();
      if (!className) return Option.none();
      const props =
        Array.filterMap(cls.getProperties(), p => {
          if (p.getScope() != "public") {
            return Option.none();
          }
          return Option.some([p.getName(), p.getType().getApparentType().getText()])
        });

      return Option.some({ extendsFrom, className, props });
    }),
    Array.dedupeWith((a, b) => a.className == b.className)
  );