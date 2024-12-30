import { JSONSchema } from "effect";

import { GenerateConfigSchema } from "../src/config-provider/schema.js";
import { writeFile, writeFileSync } from "fs";

const result = JSONSchema.make(GenerateConfigSchema);

writeFileSync("a.json", JSON.stringify(result, undefined, 2));
