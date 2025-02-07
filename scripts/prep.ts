import { JSONSchema } from "effect";

import { MainConfigSchema } from "../src/config-provider/schema";
import { writeFileSync } from "fs";

const result = JSONSchema.make(MainConfigSchema);

writeFileSync("dist/schema.json", JSON.stringify(result, undefined, 2));
