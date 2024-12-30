import { assert, describe, expect, it } from "vitest";
import { ScannedSdk } from "#/scan-sdk/_model.js";

describe("scan", () => {

  it("node modules", () => {

    const a = ScannedSdk.fromNodeModules("s3");

    assert(a._tag == "Right")

    expect(a)

  });

  

})