import { Effect, pipe } from "effect";
import { ConfigProviderService } from "#/config-provider/_service.js";
import { WriteService } from "#/write/_service.js";
import { ScannedSdk } from "#/scan-sdk/_model.js";

export class MainService
  extends Effect.Service<MainService>()("MainService", {
    effect:
      Effect.gen(function* () {

        const { clients } = yield* ConfigProviderService;
        const { writeCode } = yield* WriteService;

        const generateOneClient = 
          (client: string) => pipe(
            ScannedSdk.fromNodeModules(client),
            Effect.andThen(writeCode)
          );

        const generateAllClients =
          Effect.forEach(clients, generateOneClient, {
            concurrency: 3,
            discard: true
          });

        return {
          generateOneClient,
          generateAllClients
        } as const;

      }),

      dependencies: [
        ConfigProviderService.Default,
        WriteService.Default
      ]

  }) { }
