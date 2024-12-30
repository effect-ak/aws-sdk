#!/usr/bin/env node

console.log("🚀 gen-aws-sdk CLI started", process.cwd());

import { Effect } from "effect";
import { env, generate } from "./run";

generate.pipe(
  Effect.tap(clients => {
    return Effect.logInfo(`Successfully generated AWS Effect SDK clients`, clients)
  }),
  Effect.provide(env),
  Effect.runPromise,
)
