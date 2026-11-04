// Public API of `@whatsaaaa/form-builder-schema/json-schema`. It needs the optional peer
// `@valibot/to-json-schema`, so it has its own entry, and the main one never loads it.
export { toJsonSchema } from './json-schema/to-json-schema'
export type { JsonSchemaRegistries } from './json-schema/to-json-schema'
export type { JsonSchema } from '@valibot/to-json-schema'
