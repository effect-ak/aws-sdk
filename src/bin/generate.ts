#!/usr/bin/env node

import { Effect, Layer, Logger } from "effect";
import { MainService } from "~/main/_service";

const env = Layer.mergeAll(
  MainService.Default
).pipe(
  Layer.provideMerge(Logger.pretty)
)

MainService.pipe(
  Effect.andThen(_ => _.generateAllClients)
).pipe(
  Effect.tap(clients => {
    return Effect.logInfo(`Successfully generated AWS Effect SDK clients`, clients)
  }),
  Effect.provide(env),
  Effect.runPromise,
)
