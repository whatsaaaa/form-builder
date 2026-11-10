// Writes definition.schema.json: the JSON Schema of definitions for the default registries, and the
// copy of it the docs site hosts. Run it with `pnpm docs:gen`. CI runs it too, and fails when the
// committed files differ, so commit what it writes. The docs site's reference pages for the
// built-in rules and field types are made by apps/docs/scripts/generate.ts.
import { mkdirSync, writeFileSync } from 'node:fs'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'

// The docs site hosts it at its $id. `v1` is the format's `version`, which stays "1" for all of 1.x.
const { $schema, ...generated } = toJsonSchema(createSchemaBuilder())
const schema = {
  $schema,
  $id: 'https://whatsaaaa.github.io/form-builder/schema/v1/definition.schema.json',
  ...generated,
}

for (const path of [
  'definition.schema.json',
  '../../apps/docs/public/schema/v1/definition.schema.json',
]) {
  const url = new URL(`../${path}`, import.meta.url)
  mkdirSync(new URL('.', url), { recursive: true })
  writeFileSync(url, `${JSON.stringify(schema, null, 2)}\n`)
  console.log(`Wrote ${path}`)
}
