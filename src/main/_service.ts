import { Effect, pipe } from "effect";
import { ConfigProviderService } from "~/config-provider/_service";
import { WriteService } from "~/write/_service";
import { ScannedSdk } from "~/scan-sdk/_model";

export class MainService
  extends Effect.Service<MainService>()("MainService", {
    effect:
      Effect.gen(function* () {

        const { clients } = yield* ConfigProviderService;
        const { writeCode } = yield* WriteService;

        const generateOneClient = 
          Effect.fn("generate client")(function* (client: string) {
            const scannedSdk = yield* ScannedSdk.fromNodeModules(client)
            yield* writeCode(scannedSdk)
            return client
          })

        const generateAllClients =
          Effect.forEach(clients, generateOneClient, {
            concurrency: 3
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
