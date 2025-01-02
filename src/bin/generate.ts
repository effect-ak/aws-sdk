#!/usr/bin/env node

import { Effect } from "effect";
import { MainService } from "#/main/_service.js";

MainService.pipe(
  Effect.andThen(_ => _.generateAllClients)
).pipe(
  Effect.provide(MainService.Default),
  Effect.tap(Effect.logInfo("DONE")),
  Effect.runPromise,
);
