import { it, describe, expect } from "vitest";

import { makeProperPascalCase } from "#/util/text.js";

describe("text test", () => {

  it("pretty operation name", () => {

    expect(makeProperPascalCase("GetSAMLProviderCommandInput")).equal("GetSamlProviderCommandInput");

  });

})