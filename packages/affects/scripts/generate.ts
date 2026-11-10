// Writes definition.schema.json: the JSON Schema of definitions for a builder with `affects()`,
// made by the schema package's generator, and the copy of it the docs site hosts. Run it with
// `pnpm docs:gen`. CI runs it too, and fails when the committed files differ, so commit what it
// writes.
import { mkdirSync, writeFileSync } from 'node:fs'
import { affects } from '@whatsaaaa/form-builder-affects'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'

// The docs site hosts it at its $id. `v1` is the format's `version`, which `affects` keeps.
const { $schema, ...generated } = toJsonSchema(createSchemaBuilder({ extensions: [affects()] }))
const schema = {
  $schema,
  $id: 'https://whatsaaaa.github.io/form-builder/schema/v1/affects/definition.schema.json',
  ...generated,
  description:
    'A form for @whatsaaaa/form-builder-schema with the affects of @whatsaaaa/form-builder-affects. Run validate() too: it also checks names, defaults, form rule paths, layout references, and the fields that conditions read.',
}

for (const path of [
  'definition.schema.json',
  '../../apps/docs/public/schema/v1/affects/definition.schema.json',
]) {
  const url = new URL(`../${path}`, import.meta.url)
  mkdirSync(new URL('.', url), { recursive: true })
  writeFileSync(url, `${JSON.stringify(schema, null, 2)}\n`)
  console.log(`Wrote ${path}`)
}
