import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  defineFieldType,
  defineRule,
  formatRules,
  type SchemaBuilderOptions,
} from '@whatsaaaa/form-builder-schema'

// The type errors are the tests here: `pnpm type-check` fails when a @ts-expect-error line
// compiles. The runtime checks only show that defineForm returns its argument.

const money = defineFieldType({
  kind: 'number',
  props: v.object({ currency: v.picklist(['EUR', 'RSD']) }),
  schema: () => v.number(),
})

const even = defineRule({
  kinds: ['number'],
  create: (_, message) => v.check((input: number) => input % 2 === 0, message),
})

describe('defineForm', () => {
  const builder = createSchemaBuilder({ fieldTypes: { money }, rules: { even } })

  it('returns the definition unchanged, ready to build', () => {
    const json = {
      version: '1',
      fields: [{ name: 'price', type: 'money', currency: 'EUR', rules: [{ rule: 'even' }] }],
    } as const
    const form = builder.defineForm(json)

    expect(form).toBe(json)
    expect(() => builder.build(form)).not.toThrow()
  })

  it('types the built-in and your own types, rules and form rules', () => {
    const form = builder.defineForm({
      version: '1',
      fields: [
        { name: 'email', type: 'email', rules: [{ rule: 'maxLength', value: 120 }] },
        { name: 'price', type: 'money', currency: 'RSD', required: true },
        {
          name: 'address',
          type: 'group',
          fields: [{ name: 'city', type: 'text', rules: [{ rule: 'trim' }] }],
        },
        {
          name: 'tags',
          type: 'array',
          of: { type: 'select', options: [{ value: 1, label: 'A' }] },
        },
        { name: 'start', type: 'date', output: 'date' },
        { name: 'end', type: 'date', output: 'date' },
        { type: 'heading', text: 'Done', level: 3 },
      ],
      formRules: [
        { rule: 'compare', field: 'end', op: 'gt', other: 'start', message: 'Too early' },
      ],
    })

    expect(builder.validate(form).issues).toEqual([])
  })

  it('rejects unknown names, keys and params at compile time', () => {
    const forms = [
      // @ts-expect-error a type that isn't registered
      builder.defineForm({ version: '1', fields: [{ name: 'a', type: 'emial' }] }),
      builder.defineForm({
        version: '1',
        // @ts-expect-error a rule that isn't registered
        fields: [{ name: 'a', type: 'text', rules: [{ rule: 'maxLenght', value: 120 }] }],
      }),
      builder.defineForm({
        version: '1',
        // @ts-expect-error a param of the wrong type
        fields: [{ name: 'a', type: 'text', rules: [{ rule: 'maxLength', value: '120' }] }],
      }),
      builder.defineForm({
        version: '1',
        // @ts-expect-error a key that is neither reserved nor a prop
        fields: [{ name: 'a', type: 'text', requird: true }],
      }),
      builder.defineForm({
        version: '1',
        // @ts-expect-error a prop of the wrong type
        fields: [{ name: 'a', type: 'money', currency: 'USD' }],
      }),
      builder.defineForm({
        version: '1',
        // @ts-expect-error a mistake in a child field
        fields: [{ name: 'a', type: 'group', fields: [{ name: 'b', type: 'txt' }] }],
      }),
      builder.defineForm({
        version: '1',
        fields: [{ name: 'a', type: 'number' }],
        // @ts-expect-error a form rule without a message
        formRules: [{ rule: 'sameAs', field: 'a', other: 'b' }],
      }),
    ]

    expect(forms).toHaveLength(7)
  })

  it('knows only your rules with includeDefaultRules: false', () => {
    const lean = createSchemaBuilder({ includeDefaultRules: false, rules: formatRules })
    const form = lean.defineForm({
      version: '1',
      // @ts-expect-error minLength is in lengthRules, which isn't registered
      fields: [{ name: 'a', type: 'email', rules: [{ rule: 'minLength', value: 3 }] }],
    })

    expect(lean.validate(form).success).toBe(false)
  })

  it('still types the functions you write inline', () => {
    const { build } = createSchemaBuilder({
      kinds: { cents: { isEmpty: (input) => input === undefined } },
      fieldTypes: {
        cents: { kind: 'cents', schema: (field) => v.number(field.label) },
      },
    })

    expect(() => build({ version: '1', fields: [{ name: 'a', type: 'cents' }] })).not.toThrow()
  })

  it('accepts options typed as SchemaBuilderOptions, with string keys', () => {
    const options: SchemaBuilderOptions = { fieldTypes: { money } }
    const { defineForm } = createSchemaBuilder(options)

    expect(defineForm({ version: '1', fields: [{ name: 'a', type: 'anything' }] })).toBeDefined()
  })
})
