import * as v from 'valibot'
import type { FieldTypeDef } from './types'

export const defaultFieldTypes = {
  text: { kind: 'string', base: (m) => v.string(m) },
  password: { kind: 'string', base: (m) => v.string(m) },
  email: {
    kind: 'string',
    base: (m) => v.string(m),
    defaultRules: [{ rule: 'email', message: 'Invalid email' }],
  },
} satisfies Record<string, FieldTypeDef>
