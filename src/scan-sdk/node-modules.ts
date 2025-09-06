import { Either } from "effect";
import * as Morph from "ts-morph";
import type { ScannedSdkShape } from "./_model";

export const scanNodeModules = (
  clientName: string
): Either.Either<ScannedSdkShape, string> => {

  const sources = 
    Either.try({
      try: () => {
        const project = new Morph.Project();

        const sources = project.addSourceFilesAtPaths(`node_modules/@aws-sdk/client-${clientName}/**/*{.d.ts,.ts}`);
        return sources;
      },
      catch: (error) => {
        console.warn("sdk scanning error", error);
        return "InitProjectError"
      }
    })

  if (sources._tag == "Left") return Either.left(sources.left);

  const classes = sources.right.flatMap(_ => _.getClasses());
  const interfaces = sources.right.flatMap(_ => _.getInterfaces());

  const exceptionClass = classes.find(_ => _.getName()?.endsWith("ServiceException"));

  if (!exceptionClass) return Either.left(`Exception class not found in ${clientName}`);

  const clientClass = classes.find(_ => _.getName()?.endsWith("Client"));

  if (!clientClass) return Either.left("Client's class not found");

  const configInterface = interfaces.find(_ => _.getName()?.endsWith("ClientConfig"))

  if (!configInterface) return Either.left("Client's config interface not found")

  return Either.right({
    sdkName: clientName, classes, interfaces, exceptionClass, configInterface, clientClass
  });

}
