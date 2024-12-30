import { describe, it, assert, expect } from "vitest"
import { Effect } from "effect";
import { ConfigProviderService } from "#/config-provider/_service.js";

describe("configuration provider", () => {

  it("read configuration", async () => {

    const result =
      await Effect.gen(function* () {

        const configProvider = yield* ConfigProviderService;

        expect(configProvider.clients).not.equal([]);
        expect(configProvider.generate_to).not.equal("");

      }).pipe(
        Effect.provide(ConfigProviderService.Default),
        Effect.tapErrorCause(Effect.logError),
        Effect.runPromiseExit
      )

    assert(result._tag == "Success");

  })


})