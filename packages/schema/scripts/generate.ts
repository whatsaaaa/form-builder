// Writes definition.schema.json: the JSON Schema of definitions for the default registries. Run it
// with `pnpm docs:gen`. CI runs it too, and fails when the committed file differs, so commit what it
// writes. The docs site's reference pages for the built-in rules and field types are made by
// apps/docs/scripts/generate.ts.
import { writeFileSync } from 'node:fs'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'

const schema = toJsonSchema(createSchemaBuilder())

const url = new URL('../definition.schema.json', import.meta.url)
writeFileSync(url, `${JSON.stringify(schema, null, 2)}\n`)
console.log('Wrote definition.schema.json')
