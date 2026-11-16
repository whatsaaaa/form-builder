// Writes definition.schema.json: the JSON Schema of definitions for a builder with `fills()`,
// made by the schema package's generator, and the copy of it the docs site hosts. Run it with
// `pnpm docs:gen`. CI runs it too, and fails when the committed files differ, so commit what it
// writes.
import { mkdirSync, writeFileSync } from 'node:fs'
import { fills } from '@whatsaaaa/form-builder-fills'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'

// The docs site hosts it at its $id. `v1` is the format's `version`, which `fills` keeps.
const { $schema, ...generated } = toJsonSchema(createSchemaBuilder({ extensions: [fills()] }))
const schema = {
  $schema,
  $id: 'https://whatsaaaa.github.io/form-builder/schema/v1/fills/definition.schema.json',
  ...generated,
  description:
    'A form for @whatsaaaa/form-builder-schema with the fills of @whatsaaaa/form-builder-fills. Run validate() too: it also checks names, defaults, form rule paths, layout references, and the fields that fills set and the values of their maps.',
}

for (const path of [
  'definition.schema.json',
  '../../apps/docs/public/schema/v1/fills/definition.schema.json',
]) {
  const url = new URL(`../${path}`, import.meta.url)
  mkdirSync(new URL('.', url), { recursive: true })
  writeFileSync(url, `${JSON.stringify(schema, null, 2)}\n`)
  console.log(`Wrote ${path}`)
}
