import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'

// #region resolve
const translations: Record<string, string> = {
  'form.required': 'Obavezno polje',
  'signup.email': 'E-pošta',
  'signup.password.short': 'Najmanje 10 karaktera',
}

const builder = createSchemaBuilder({
  messages: { required: 'form.required' },
  // Called with every message, label and description of the definition.
  resolveMessage: (key) => translations[key],
})
// #endregion resolve

// #region build
const schema = builder.build({
  version: '1',
  fields: [
    { name: 'email', type: 'email', label: 'signup.email', required: true },
    {
      name: 'password',
      type: 'password',
      required: true,
      rules: [
        { rule: 'minLength', value: 10, message: 'signup.password.short' },
      ],
    },
  ],
})

const result = v.safeParse(schema, { email: '', password: 'short' })
// The issues' messages: 'Obavezno polje' for email, 'Najmanje 10 karaktera' for password.
// #endregion build

const messages = result.issues?.map((issue) => issue.message)
if (messages?.join() !== 'Obavezno polje,Najmanje 10 karaktera') {
  throw new Error(`Unexpected messages: ${messages?.join()}`)
}
