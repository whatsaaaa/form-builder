import {
  createSchemaBuilder,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'

const definition: JsonForm = {
  version: '1',
  fields: [
    { name: 'email', type: 'email', label: 'Email', required: true },
    {
      name: 'password',
      type: 'password',
      label: 'Password',
      required: true,
      rules: [
        { rule: 'minLength', value: 10, message: 'At least 10 characters' },
      ],
    },
  ],
}

const builder = createSchemaBuilder()
const schema = builder.build(definition)

const output = v.parse(schema, {
  email: 'jane@example.com',
  password: 'correct horse',
})
const result = v.safeParse(schema, { email: 'jane', password: 'short' }) // result.success is false

if (output.email !== 'jane@example.com' || result.success)
  throw new Error('Unexpected result')
