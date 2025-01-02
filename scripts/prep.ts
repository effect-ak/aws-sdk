import { JSONSchema } from "effect";

import { GenerateConfigSchema } from "../src/config-provider/schema.js";
import { writeFileSync } from "fs";

const result = JSONSchema.make(GenerateConfigSchema);

writeFileSync("dist/schema.json", JSON.stringify(result, undefined, 2));
