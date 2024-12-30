import type { ScannedSdk } from "#/scan-sdk/_model.js";
import type { TypeNames, TypescriptSourceFile } from "#/type.js";

export const writeClientPart = (
  { configInterface, exceptionClass }: ScannedSdk,
  { clientName, clientApiInterface, commandsFactory, exceptionName, allExceptions }: TypeNames,
  out: TypescriptSourceFile,
) => {

  out.addFunction({
    isExported: true,
    name: `make${clientName}Client`,
    parameters: [
      {
        name: "config",
        hasQuestionToken: true,
        type: `Sdk.${configInterface.getName()}`
      }
    ],
    statements: `
      console.log(\`Initializing aws client '${clientName}'\`);
    
      const client = new _SdkClient(config ?? {});
    
      const close = () => {
        console.log("closing client '${clientName}'");
        client.destroy();
      };
    
      process.on("SIGTERM", close);
      process.on("SIGINT", close);
    
      const execute = <M extends keyof ${clientApiInterface}, E extends ${exceptionName}>(
        actionName: M,
        actionInput: Parameters<${clientApiInterface}[M]>[0]
      ) => {
    
        const command = new ${commandsFactory}[actionName](actionInput);
    
        return client
          .send(command)
          .then(success => new ${clientName}Success(success))
          .catch(error => {
            if (error instanceof ${exceptionClass.getName()} && error.name in ${allExceptions}) {
              return new ${clientName}ExpectedError(error as ${exceptionClass.getName()} & { name: ${exceptionName} });
            } else {
              return new ${clientName}UnexpectedError(error);
            }
          })
          .then(_ => _ as ActionResult<M, E>)
    
      }
    
      return execute;
    `
  }).formatText()

}
