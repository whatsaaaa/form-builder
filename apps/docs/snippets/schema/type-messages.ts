import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'

// #region message
const builder = createSchemaBuilder()

const schema = builder.build({
  version: '1',
  fields: [
    { name: 'work', type: 'email' },
    {
      name: 'home',
      type: 'email',
      // Replaces the type's email rule: the value is checked once.
      rules: [{ rule: 'email', message: 'Enter a valid email address' }],
    },
  ],
})

const result = v.safeParse(schema, { work: 'nope', home: 'nope' })
// The issues' messages: 'Invalid email: Received "nope"' for work,
// 'Enter a valid email address' for home.
// #endregion message

const messages = result.issues?.map((issue) => issue.message)
if (
  messages?.join(' | ') !==
  'Invalid email: Received "nope" | Enter a valid email address'
) {
  throw new Error(`Unexpected messages: ${messages?.join(' | ')}`)
}
