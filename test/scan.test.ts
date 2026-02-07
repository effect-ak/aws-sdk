import { describe, it, expect } from "vitest";
import { makePrettyOperationName, makeProperPascalCase } from "~/scan";

describe("scan", () => {

  it("pretty", () => {
    expect(makeProperPascalCase("GetSAMLProviderCommandInput")).equal("GetSamlProviderCommandInput");
    expect(makeProperPascalCase("GetSAML")).equal("GetSaml");
    expect(makePrettyOperationName("listObjectsV2")).equal("list_objects_v2");
  });

});