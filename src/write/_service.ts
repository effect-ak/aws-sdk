import { Effect } from "effect";
import { IndentationText, Project } from "ts-morph";

import { ScannedSdk } from "#/scan-sdk/_model.js";
import { ConfigProviderService } from "#/config-provider/_service.js";
import { writeResultPart } from "./code-parts/result.js";
import { writeSdkPart } from "./code-parts/sdk.js";
import { writeClientPart } from "./code-parts/client.js";
import { getTypeNames } from "./names.js";
import { writeHeadPart } from "./code-parts/head.js";

export class WriteService
  extends Effect.Service<WriteService>()("WriteService", {
    effect:
      Effect.gen(function* () {

        const { generate_to } = yield* ConfigProviderService;

        const project = new Project({
          manipulationSettings: {
            indentationText: IndentationText.TwoSpaces
          }
        });
      
        const writeCode = (
          scannedSdk: ScannedSdk
        ) =>
          Effect.try(() => {

            const out = project.createSourceFile(`${generate_to}/${scannedSdk.sdkName}.ts`, "", { overwrite: true });
            const typeNames = getTypeNames(scannedSdk);
        
            writeHeadPart(scannedSdk, out);
            writeClientPart(scannedSdk, typeNames, out);
            writeResultPart(scannedSdk, typeNames, out);
            writeSdkPart(scannedSdk, typeNames, out);

            return out;

          }).pipe(
            Effect.andThen(_ => _.save())
          );

        return {
          writeCode
        }

      }),

      dependencies: [
        ConfigProviderService.Default
      ]

  }) { }
