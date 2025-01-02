import { pipe, String } from "effect";

export function makeProperPascalCase(str: string): string {
  const words = str.match(/([A-Z]+(?=[A-Z][a-z])|[A-Z][a-z]*)/g);
  if (!words) return str;
  return words
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join('');
}

export function makePrettyOperationName(input: string) {
  return pipe(
    makeProperPascalCase(input),
    String.pascalToSnake
  )
}
