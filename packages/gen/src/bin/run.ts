import { Effect, Layer, Logger } from "effect";
import { MainService } from "~/main";

export const env = Layer.mergeAll(
  MainService.Default
).pipe(
  Layer.provideMerge(Logger.pretty)
);

export const generate = MainService.pipe(
  Effect.andThen(_ => _.generateAllClients)
);
