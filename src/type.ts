import type * as M from "ts-morph";
import type { getTypeNames } from "./write/names.js";

export type TypescriptSourceFile = M.SourceFile;
export type InterfaceDeclaration = M.InterfaceDeclarationStructure;

export type TypeNames = ReturnType<typeof getTypeNames>;
