import { it, describe, expect } from "vitest";

import { makePrettyOperationName, makeProperPascalCase,  } from "#/util/text.js";

describe("text test", () => {

  it("pretty", () => {

    expect(makeProperPascalCase("GetSAMLProviderCommandInput")).equal("GetSamlProviderCommandInput");
    expect(makeProperPascalCase("GetSAML")).equal("GetSaml");
    expect(makePrettyOperationName("listObjectsV2")).equal("list_objects_v2");

  });

})