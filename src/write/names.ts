import type { ScannedSdkShape } from "#/scan-sdk/_model.js";

export function getTypeNames(
  input: Pick<ScannedSdkShape, "clientClass">
) {

  const clientName = input.clientClass.getName()!.slice(0, "client".length * -1);

  return {
    clientName,
    clientApiInterface: `${clientName}Api`,
    commandsFactory: `${clientName}CommandFactory`,
    exceptionClassName: `${clientName}Exception`
  } as const;

}
