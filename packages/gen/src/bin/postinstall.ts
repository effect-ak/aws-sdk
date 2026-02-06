#!/usr/bin/env node

import { existsSync, readFileSync } from "fs";
import { Effect } from "effect";
import { env, generate } from "./run";

const SKIP_GENERATE = process.env.EFFECT_AWS_SDK_SKIP_GENERATE;

if (SKIP_GENERATE === "1" || SKIP_GENERATE === "true") {
  console.log("[@effect-ak/aws-sdk] Skipping generation (EFFECT_AWS_SDK_SKIP_GENERATE is set)");
  process.exit(0);
}

// Skip if we're in the package's own directory (during development)
const packageJsonPath = `${process.cwd()}/package.json`;
if (existsSync(packageJsonPath)) {
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    if (pkg.name === "@effect-ak/aws-sdk") {
      process.exit(0);
    }
  } catch {}
}

console.log(`[@effect-ak/aws-sdk] Running postinstall generation in ${process.cwd()}`);

generate.pipe(
  Effect.tap(clients => {
    if (clients.length > 0) {
      console.log(`[@effect-ak/aws-sdk] Generated Effect wrappers for: ${clients.join(", ")}`);
    } else {
      console.log("[@effect-ak/aws-sdk] No AWS SDK clients found to generate");
    }
    return Effect.void;
  }),
  Effect.catchAll(error => {
    console.warn("[@effect-ak/aws-sdk] Generation warning:", String(error));
    return Effect.succeed([] as string[]);
  }),
  Effect.provide(env),
  Effect.runPromise
).catch(error => {
  console.warn("[@effect-ak/aws-sdk] Postinstall error (non-fatal):", error?.message || error);
  process.exit(0);
});
