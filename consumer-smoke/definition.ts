import { affects } from '@whatsaaaa/form-builder-affects'
import { type FillSource, fills } from '@whatsaaaa/form-builder-fills'
import {
  createSchemaBuilder,
  defineFieldType,
  defineRule,
  DefinitionError,
} from '@whatsaaaa/form-builder-schema'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'
import * as v from 'valibot'

// A field type, a rule, extensions and a source of fills of your own, the way an app registers them.
const money = defineFieldType({
  kind: 'number',
  props: v.object({ currency: v.picklist(['EUR', 'USD']) }),
  schema: () => v.number(),
})

const even = defineRule({
  kinds: ['number'],
  create: (_, message) => v.check((input: number) => input % 2 === 0, message),
})

const companies: FillSource = (value) => (value === 'business' ? { company: 'Acme' } : null)

export const builder = createSchemaBuilder({
  fieldTypes: { money },
  rules: { even },
  extensions: [affects(), fills({ sources: { companies } })],
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
      fills: { source: 'companies', fields: ['company'] },
    },
    {
      name: 'company',
      type: 'text',
      label: 'Company',
      required: true,
      affects: [{ effect: 'hideAndClear', when: { field: 'accountType', notEquals: 'business' } }],
    },
    {
      name: 'profile',
      type: 'select',
      label: 'Profile',
      default: 'marko',
      options: [{ value: 'marko', label: 'Marko' }],
      fills: { map: { marko: { fullName: 'Marko Petrović' } } },
    },
    { name: 'fullName', type: 'text', label: 'Full name' },
    { name: 'budget', type: 'money', label: 'Budget', currency: 'EUR', rules: [{ rule: 'even' }] },
  ],
  layout: {
    steps: [
      {
        id: 'you',
        label: 'You',
        items: ['email', 'accountType', 'company', 'profile', 'fullName'],
      },
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
  const { issues } = builder.validate({
    version: '1',
    fields: [
      { name: 'a', type: 'text', fills: { source: 'nope', fields: ['b'] } },
      { name: 'b', type: 'text' },
    ],
  })
  if (issues[0]?.code !== 'unknown_source') throw new Error('an unknown source should be reported')
  // The map fills in the name for the profile's default, before any render.
  if (builder.getInitialInput(definition)['fullName'] !== 'Marko Petrović') {
    throw new Error('the map should fill the initial input')
  }

  try {
    builder.build({ version: '1', fields: [{ name: 'a', type: 'nope' }] })
    throw new Error('an unknown type should throw')
  } catch (error) {
    if (!(error instanceof DefinitionError)) throw error
  }
}
