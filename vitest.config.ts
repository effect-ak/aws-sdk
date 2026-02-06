import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'packages/gen/vitest.config.ts',
      'packages/services/vitest.config.ts',
      'demo/test/vitest.config.ts'
    ]
  }
})
