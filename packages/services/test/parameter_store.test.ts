import { Effect, Schema as S, Logger, LogLevel, Cause } from "effect";
import { ssm, makeClients } from "../src/clients/index.js";
import { getConfigFromParameterStore } from "../src/parameter_store.js";
import { describe, it, expect } from "vitest";

const TestConfigSchema = S.Struct({
  name: S.String,
  port: S.Number,
  enabled: S.Boolean
});

describe.skip("getConfigFromParameterStore", () => {
  it("should show function name in error stack when parameter not found", async () => {
    const clients = makeClients({ ssm: { region: "us-east-1" } });

    const program = Effect.gen(function* () {
      // Try to read non-existent parameter
      yield* ssm.make("get_parameter", {
        Name: "/non/existent/parameter"
      });
    }).pipe(
      Effect.provide(clients)
    );

    const result = await Effect.runPromiseExit(program);

    if (result._tag === "Failure") {
      console.log("\n=== Effect Pretty Error ===");
      console.log(Cause.pretty(result.cause));
      console.log("=========================\n");
    }

    expect(result._tag).toBe("Failure");
  });

  it("should read and parse TOML config from parameter store", async () => {
    const testParameterName = "/test/config/integration-test";
    const testTomlContent = `
name = "test-service"
port = 8080
enabled = true
`;

    const clients = makeClients({ ssm: { region: "us-east-1" } });

    const program = Effect.gen(function* () {
      // Create parameter
      yield* Effect.log("Calling ssm.put_parameter");
      const putResult = yield* ssm.make("put_parameter", {
        Name: testParameterName,
        Value: testTomlContent,
        Type: "String",
        Overwrite: true
      });

      expect(putResult.Version).toBeGreaterThan(0);

      // Read and parse config
      const config = yield* getConfigFromParameterStore({
        path: testParameterName,
        configSchema: TestConfigSchema
      });

      expect(config.name).toBe("test-service");
      expect(config.port).toBe(8080);
      expect(config.enabled).toBe(true);

      // Cleanup
      const deleteResult = yield* ssm.make("delete_parameter", {
        Name: testParameterName
      });

      expect(deleteResult).toBeDefined();

      return config;
    }).pipe(
      Effect.provide(clients)
    );

    const result = await program.pipe(
      Logger.withMinimumLogLevel(LogLevel.Debug),
      Effect.provide(Logger.pretty),
      Effect.runPromiseExit
    );

    expect(result._tag).toBe("Success");
  });
});
