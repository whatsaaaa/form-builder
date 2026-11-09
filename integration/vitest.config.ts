import angular from '@analogjs/vite-plugin-angular'
import { qwikVite } from '@qwik.dev/core/optimizer'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The bindings render into jsdom. happy-dom can't check a radio button whose name has quotes,
    // and Formisch names every element with the JSON of its path, like ["newsletter"].
    environment: 'jsdom',
    // West of UTC, so a date that comes out at UTC midnight is the day before.
    env: { TZ: 'America/New_York' },
    projects: [
      {
        extends: true,
        test: { name: 'bindings', include: ['tests/**/*.test.{ts,tsx}'] },
      },
      {
        // Vite takes the JSX settings from the tsconfig.json next to each example.
        extends: true,
        test: { name: 'preact', include: ['examples/preact/**/*.test.tsx'] },
      },
      {
        extends: true,
        plugins: [solid()],
        test: { name: 'solid', include: ['examples/solid/**/*.test.tsx'] },
      },
      {
        extends: true,
        plugins: [svelte({ configFile: false })],
        // Svelte's own entry for the browser, not the one for server rendering.
        resolve: { conditions: ['browser'] },
        test: { name: 'svelte', include: ['examples/svelte/**/*.test.ts'] },
      },
      {
        extends: true,
        plugins: [angular({ tsconfig: 'examples/angular/tsconfig.json' })],
        test: { name: 'angular', include: ['examples/angular/**/*.test.ts'] },
      },
      {
        extends: true,
        plugins: [
          qwikVite({
            csr: true,
            srcDir: 'examples/qwik',
            // Not the schema package. An app gets it compiled, so Qwik's optimizer never sees its
            // source, and it miscompiles some of it: `const i = a[n++]`, read twice, becomes
            // `a[n++]` twice.
            fileFilter: (id, hook) => hook !== 'transform' || !id.includes('/packages/schema/'),
          }),
        ],
        test: {
          name: 'qwik',
          include: ['examples/qwik/**/*.test.tsx'],
          environment: './tests/qwik-environment.ts',
        },
      },
    ],
  },
})
