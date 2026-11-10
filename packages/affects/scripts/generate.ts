// Writes definition.schema.json: the JSON Schema of definitions for a builder with `affects()`,
// made by the schema package's generator. Run it with `pnpm docs:gen`. CI runs it too, and fails
// when the committed file differs, so commit what it writes.
import { writeFileSync } from 'node:fs'
import { affects } from '@whatsaaaa/form-builder-affects'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'

const schema = {
  ...toJsonSchema(createSchemaBuilder({ extensions: [affects()] })),
  description:
    'A form for @whatsaaaa/form-builder-schema with the affects of @whatsaaaa/form-builder-affects. Run validate() too: it also checks names, defaults, form rule paths, layout references, and the fields that conditions read.',
}

const url = new URL('../definition.schema.json', import.meta.url)
writeFileSync(url, `${JSON.stringify(schema, null, 2)}\n`)
console.log('Wrote definition.schema.json')
