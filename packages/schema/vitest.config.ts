import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text', 'html', 'json-summary'],
      // CI fails when coverage drops below these.
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
})
