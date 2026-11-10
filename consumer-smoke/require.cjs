// Loads the packages with require(), the way a CommonJS app does: Node 20.19 and later load the
// ES modules they ship without a flag.
/* eslint-disable @typescript-eslint/no-require-imports */
const { affects } = require('@whatsaaaa/form-builder-affects')
const { createSchemaBuilder } = require('@whatsaaaa/form-builder-schema')
const { toJsonSchema } = require('@whatsaaaa/form-builder-schema/json-schema')
const vue = require('@whatsaaaa/form-builder-vue')
const react = require('@whatsaaaa/form-builder-react')

const builder = createSchemaBuilder({ extensions: [affects()] })
if (typeof toJsonSchema(builder) !== 'object') throw new Error('no JSON Schema')
for (const [name, adapter] of Object.entries({ vue, react })) {
  if (typeof adapter.useJsonForm !== 'function') throw new Error(`${name}: no useJsonForm`)
}
console.log('require ok')
