import * as v from 'valibot'
import { defineFieldType } from './define-field-type'
import type { FieldTypeDef } from './field-type-def'

/**
 * Elements without a value. They need no name and add no output key. Their `text` can be an
 * i18n key: renderers resolve it with the same function they pass as `resolveMessage`.
 */
export const displayTypes = {
  heading: defineFieldType({
    kind: 'none',
    props: v.object({
      text: v.string(),
      /** 1 to 6. Defaults to 2. */
      level: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(6))),
    }),
    meta: { label: 'Heading', description: 'A title between fields. It has no value' },
  }),
  // Plain text. Whether to render markdown is up to the renderer.
  paragraph: defineFieldType({
    kind: 'none',
    props: v.object({ text: v.string() }),
    meta: { label: 'Paragraph', description: 'Plain text between fields. It has no value' },
  }),
  divider: {
    kind: 'none',
    meta: { label: 'Divider', description: 'A line between fields. It has no value' },
  },
} satisfies Record<string, FieldTypeDef>
