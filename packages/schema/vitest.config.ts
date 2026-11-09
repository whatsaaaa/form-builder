import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html', 'json-summary'],
      // Every `vitest run` (including CI's `pnpm test`) fails below these.
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
})
