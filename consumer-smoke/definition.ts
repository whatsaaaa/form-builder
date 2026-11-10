import { affects } from '@whatsaaaa/form-builder-affects'
import {
  createSchemaBuilder,
  defineFieldType,
  defineRule,
  DefinitionError,
} from '@whatsaaaa/form-builder-schema'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'
import * as v from 'valibot'

// A field type, a rule and an extension of your own, the way an app registers them.
const money = defineFieldType({
  kind: 'number',
  props: v.object({ currency: v.picklist(['EUR', 'USD']) }),
  schema: () => v.number(),
})

const even = defineRule({
  kinds: ['number'],
  create: (_, message) => v.check((input: number) => input % 2 === 0, message),
})

export const builder = createSchemaBuilder({
  fieldTypes: { money },
  rules: { even },
  extensions: [affects()],
})

export const definition = builder.defineForm({
  version: '1',
  fields: [
    { name: 'email', type: 'email', label: 'Email', required: true },
    {
      name: 'accountType',
      type: 'radio',
      label: 'Account',
      required: true,
      options: [
        { value: 'personal', label: 'Personal' },
        { value: 'business', label: 'Business' },
      ],
    },
    {
      name: 'company',
      type: 'text',
      label: 'Company',
      required: true,
      affects: [{ effect: 'hideAndClear', when: { field: 'accountType', notEquals: 'business' } }],
    },
    { name: 'budget', type: 'money', label: 'Budget', currency: 'EUR', rules: [{ rule: 'even' }] },
  ],
  layout: {
    steps: [
      { id: 'you', label: 'You', items: ['email', 'accountType', 'company'] },
      { id: 'budget', label: 'Budget', items: ['budget'] },
    ],
  },
})

interface Output {
  email: string
  accountType: 'personal' | 'business'
  company?: string
  budget?: number
}

/** Checks what a server does with the definition: parse posted input, and its JSON Schema. */
export function checkServer(): void {
  const output: Output = v.parse(builder.build<Output>(definition), {
    email: 'jane@example.com',
    accountType: 'personal',
    budget: 2,
  })
  if (output.company !== undefined) throw new Error('company should be cleared')
  if (typeof toJsonSchema(builder) !== 'object') throw new Error('no JSON Schema')

  try {
    builder.build({ version: '1', fields: [{ name: 'a', type: 'nope' }] })
    throw new Error('an unknown type should throw')
  } catch (error) {
    if (!(error instanceof DefinitionError)) throw error
  }
}
