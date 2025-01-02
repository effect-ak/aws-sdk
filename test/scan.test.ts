import { assert, describe, expect, it } from "vitest";
import { ScannedSdk } from "#/scan-sdk/_model.js";

describe("scan", () => {

  it("node modules", () => {

    const sdk = ScannedSdk.fromNodeModules("lambda");

    assert(sdk._tag == "Right");

    const errors = sdk.right.getExceptions();
    const name = sdk.right.getCommands().find(_ => _.originName == "UpdateFunctionCode");

    const a = 1;

  });

  

})