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
    input.classes,
    Array.filterMap(cls => {
      const ext = cls.getExtends();
      if (!ext) return Option.none();
      const extendsFrom = ext.getExpression().getText();
      if (!extendsFrom.endsWith("Exception")) return Option.none();
      const className = cls.getName();
      if (!className) return Option.none();
      let baseName = className.replace("Exception", "");
      baseName = baseName.replace("Error", "");
      const props =
        Array.filterMap(cls.getProperties(), p => {
          if (p.getScope() != "public") return Option.none();
          const type = p.getType();
          return Option.some({ 
            name: p.getName(),
            type: type.isLiteral() ? 
              type.getLiteralValue()?.toString() : 
              type.getApparentType().getText(),
          })
        });

      // if (props.length == 0) return Option.none();
      return Option.some({ baseName, className, extendsFrom, props });
    }),
    Array.dedupeWith((a, b) => a.className == b.className)
  );