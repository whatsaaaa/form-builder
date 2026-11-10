import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The components render into a DOM, and the tests type into it.
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      reporter: [
        'text',
        'html',
        'json-summary',
        // Paths from the repo root, so Codecov puts each file in the right package.
        ['lcov', { projectRoot: fileURLToPath(new URL('../..', import.meta.url)) }],
      ],
      // `pnpm test:coverage` (run by CI) fails below these.
      thresholds: { statements: 95, branches: 95, functions: 95, lines: 95 },
    },
  },
})
