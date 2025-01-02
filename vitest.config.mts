import { defineConfig } from 'vitest/config'
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [
    tsconfigPaths()
  ],
  test: {
    env: {
      "effect-ak-aws_project-id": "test-ak",
      LOG_LEVEL: "debug"
    }
  }
});
