import { affects } from '@whatsaaaa/form-builder-affects'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'

/** A builder that knows the conditions of `@whatsaaaa/form-builder-affects`. */
export const builder = createSchemaBuilder({ extensions: [affects()] })
