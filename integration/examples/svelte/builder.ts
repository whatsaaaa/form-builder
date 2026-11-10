import { affects } from '@whatsaaaa/form-builder-affects'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'

/**
 * One builder for the schema, the initial input, the layout, what the conditions hide, and new
 * array items. With affects, the fields' conditions hide them: the schema doesn't validate them,
 * and the view leaves them out.
 */
export const builder = createSchemaBuilder({ extensions: [affects()] })
