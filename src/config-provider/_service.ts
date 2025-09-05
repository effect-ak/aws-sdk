import { Effect } from "effect";

import { readConfiguration } from "./read-files";

export class ConfigProviderService
  extends Effect.Service<ConfigProviderService>()("ConfigProviderService", {
    effect:
      Effect.gen(function* () {

        const { definedConfig, clientsInPackageJson } = yield* readConfiguration;

        if (clientsInPackageJson.length == 0) {
          yield* Effect.logWarning("No clients to generate");
        };

        const config = {
          generate_to: definedConfig.generate_to ?? "src/generated",
          clients: definedConfig.clients ?? clientsInPackageJson,
          global: definedConfig.global
        } as const;

        yield* Effect.logInfo("current config", config)

        return config;

      })

  }) { }
