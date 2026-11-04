import { defineConfig } from 'tsdown'

export default defineConfig({
  // json-schema is its own entry because it needs the optional peer @valibot/to-json-schema.
  entry: { index: 'src/index.ts', 'json-schema': 'src/json-schema.ts' },
  platform: 'neutral',
  dts: true,
  sourcemap: true,
  clean: true,
})
