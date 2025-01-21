import { pipe, String } from "effect";

const isUpperCase = 
  (input: string) => input.toUpperCase() == input

const toProperCase = 
  (index: number, input: string) => {
    if (index == 0) return input[index];
    if (
      isUpperCase(input[index]) && 
      isUpperCase(input[index - 1]) && 
      (index == input.length - 1 || isUpperCase(input[index + 1]))
    ) return String.toLowerCase(input[index]);
    return input[index];
  }

export function makeProperPascalCase(str: string): string {

  const letters: string[] = [];

  for (let i = 0; i < str.length; i++) {
    letters.push(toProperCase(i, str))
  }

  return letters.join("");
}

export function makePrettyOperationName(input: string) {
  return pipe(
    makeProperPascalCase(input),
    String.pascalToSnake
  )
}
