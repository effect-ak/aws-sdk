import { Effect } from "effect";

import { readConfiguration } from "./read-files.js";

export class ConfigProviderService
  extends Effect.Service<ConfigProviderService>()("ConfigProviderService", {
    effect:
      Effect.gen(function* () {

        const { definedConfig, clientsInPackageJson } = yield* readConfiguration;

        if (clientsInPackageJson.length == 0) {
          yield* Effect.logWarning("No clients to generate");
        }

        return {
          generate_to: definedConfig.generate_to ?? "src/generated",
          clients: clientsInPackageJson
        } as const;

      })

  }) { }
