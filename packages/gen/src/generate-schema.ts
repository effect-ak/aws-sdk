import { JSONSchema } from "effect";
import { writeFile } from "fs/promises";
import { MainConfigSchema } from "./config.js";

async function generateSchema() {
  const jsonSchema = JSONSchema.make(MainConfigSchema);

  await writeFile(
    "schema.json",
    JSON.stringify(jsonSchema, null, 2),
    "utf-8"
  );

  console.log("schema.json generated successfully");
}

generateSchema().catch(console.error);
