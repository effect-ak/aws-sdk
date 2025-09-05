import { Data, Either } from "effect";
import * as Morph from "ts-morph";

import { scanNodeModules } from "./node-modules";
import { getCommands } from "./commands";
import { getExceptions } from "./exceptions";

export interface ScannedSdkShape {
  sdkName: string,
  classes: Morph.ClassDeclaration[],
  interfaces: Morph.InterfaceDeclaration[],
  clientClass: Morph.ClassDeclaration,
  exceptionClass: Morph.ClassDeclaration,
  configInterface: Morph.InterfaceDeclaration
}

export class ScannedSdk
  extends Data.Class<ScannedSdkShape> {

  static fromNodeModules = (client: string) =>
    scanNodeModules(client).pipe(Either.andThen(_ => new ScannedSdk(_)));

  getCommands = () => getCommands(this);

  getExceptions = () => getExceptions(this);

}
