import { Effect } from "effect";
import { ConfigProviderService } from "./config";
import { WriteService } from "./write";
import { ScannedSdk } from "./scan";

export class MainService
  extends Effect.Service<MainService>()("MainService", {
    effect:
      Effect.gen(function* () {

        const { clients } = yield* ConfigProviderService;
        const { writeCode, writeIndex, writeInternalUtils, save } = yield* WriteService;

        const generateOneClient =
          Effect.fn("generate client")(function* (client: string) {
            const scannedSdk = yield* ScannedSdk.fromNodeModules(client)
            yield* writeCode(scannedSdk)
            return client
          })

        const generateAllClients =
          Effect.gen(function* () {
            yield* writeInternalUtils
            const scannedSdks = yield* Effect.forEach(clients, client =>
              ScannedSdk.fromNodeModules(client), {
              concurrency: 3
            });
            yield* Effect.forEach(scannedSdks, writeCode, {
              concurrency: 3
            });
            yield* writeIndex(scannedSdks)
            yield* save
            return scannedSdks.map(_ => _.sdkName)
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
