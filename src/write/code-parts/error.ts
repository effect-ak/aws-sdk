import type { ScannedSdk } from "#/scan-sdk/_model.js";
import type { TypeNames, TypescriptSourceFile } from "#/type.js";

export const writeErrorPart = (
  { }: ScannedSdk,
  { clientName, clientApiInterface }: TypeNames,
  out: TypescriptSourceFile
) => {

  out.addStatements(`
    type UnionToIntersection<U> =
      (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
    
    type ${clientName}Errors = UnionToIntersection<{
      [C in keyof ${clientApiInterface}]: ${clientApiInterface}[C][2] extends never ? {} : {
        [E in keyof ${clientApiInterface}[C][2]]: ${clientApiInterface}[C][2][E]
      }
    }[keyof ${clientApiInterface}]> extends infer I ? { [K in keyof I]: I[K] } : never;
  `).forEach(_ => _.formatText());

  out.addStatements(`
    export class ${clientName}Error<C extends keyof ${clientApiInterface}, E extends _ServiceBaseError = _ServiceBaseError> {
      readonly _tag = "${clientName}Error";
    
      constructor(
        readonly cause: E,
        readonly command: C
      ) {}
    
      $is<N extends keyof ${clientName}Api[C][2]>(
        name: N
      ): this is ${clientName}Error<C, ${clientName}Api[C][2][N] & _ServiceBaseError> {
        return this.cause.name == name;
      }

      is<N extends keyof ${clientName}Errors>(
        name: N
      ): this is ${clientName}Error<C, ${clientName}Errors[N]> {
        return this.cause.name == name;
      }

    }
  `).at(0)?.formatText();

}
