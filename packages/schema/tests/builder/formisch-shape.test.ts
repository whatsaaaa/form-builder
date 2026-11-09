import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { createSchemaBuilder, type JsonForm } from '@whatsaaaa/form-builder-schema'
import { type Fixture, fixtures, formRuleFixtures } from '../fixtures'
import { form, messages } from '../helpers'

const builder = createSchemaBuilder()

/** Formisch starts a field inside one of these without a value. */
const nullish = ['optional', 'nullable', 'nullish', 'exact_optional', 'undefinedable']
/** Formisch looks through these to the schema of a field. */
const wrappers = [...nullish, 'non_optional', 'non_nullable', 'non_nullish']

type Wrapper = v.OptionalSchema<v.GenericSchema, unknown>

/**
 * The schema Formisch makes a field's store from, the way it reads it, and whether the field is
 * inside optional or the like. Formisch for Qwik throws on `v.lazy`, so it stops there.
 */
function formischView(schema: v.GenericSchema, inNullish = false) {
  if (wrappers.includes(schema.type)) {
    return formischView((schema as Wrapper).wrapped, inNullish || nullish.includes(schema.type))
  }
  return { schema, nullish: inNullish }
}

/** The kind of store Formisch makes: an array, an object or a single value. */
function storeKind(schema: v.GenericSchema): 'array' | 'object' | 'value' | 'lazy' {
  const { type } = formischView(schema).schema
  if (type === 'array' || type === 'object' || type === 'lazy') return type
  return 'value'
}

/** The schema of the field at `path`, the way Formisch finds it. */
const schemaAt = (schema: v.GenericSchema, path: readonly (string | number)[]) =>
  path.reduce<v.GenericSchema>((parent, key) => {
    const inner = formischView(parent).schema
    return key === '*'
      ? (inner as v.ArraySchema<v.GenericSchema, undefined>).item
      : (inner as v.ObjectSchema<v.ObjectEntries, undefined>).entries[key]!
  }, schema)

const allFixtures = Object.entries({ ...fixtures, ...formRuleFixtures })

describe('the schema Formisch reads', () => {
  it.each(allFixtures)('has the store kind of each field of the %s fixture', (_, json: Fixture) => {
    const schema = builder.build(json as JsonForm)
    const fields = [...builder.walkFields(json as JsonForm)].filter(
      (field) => field.kind !== 'none',
    )

    expect(fields.map((field) => storeKind(schemaAt(schema, field.dataPath)))).toEqual(
      fields.map((field) =>
        field.kind === 'array' || field.kind === 'object' ? field.kind : 'value',
      ),
    )
  })

  it.each([true, false])(
    'is an array for a multiselect and for multiple files, required: %s',
    (required) => {
      const options = [{ value: 'a', label: 'A' }]
      const { entries } = builder.build(
        form(
          { name: 'picks', type: 'multiselect', options, required, label: 'Picks' },
          { name: 'files', type: 'file', multiple: true, required },
          { name: 'pngs', type: 'file', multiple: true, accept: 'image/png', required },
        ),
      )

      expect(storeKind(entries.picks!)).toBe('array')
      expect(storeKind(entries.files!)).toBe('array')
      expect(storeKind(entries.pngs!)).toBe('array')
    },
  )

  it("is the type's own schema for a single value", () => {
    const { entries } = builder.build(
      form(
        { name: 'name', type: 'text', required: true, rules: [{ rule: 'trim' }] },
        { name: 'age', type: 'number' },
        { name: 'terms', type: 'checkbox', required: true },
      ),
    )

    expect(formischView(entries.name!).schema.type).toBe('string')
    expect(formischView(entries.age!).schema.type).toBe('number')
    expect(formischView(entries.terms!).schema.type).toBe('boolean')
  })

  // Formisch would start a required string field with '' outside optional.
  it.each([true, false])('starts a field without a value, required: %s', (required) => {
    const { entries } = builder.build(form({ name: 'name', type: 'text', required }))

    expect(formischView(entries.name!).nullish).toBe(true)
  })

  it('reads an empty value the same way', () => {
    const options = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ]
    const schema = builder.build(
      form(
        { name: 'picks', type: 'multiselect', options, required: true },
        { name: 'more', type: 'multiselect', options },
      ),
    )

    expect(messages(schema, { picks: [] })).toEqual(['Required'])
    expect(messages(schema, { picks: undefined })).toEqual(['Required'])
    expect(messages(schema, { more: [] })).toEqual([
      'Invalid key: Expected "picks" but received undefined',
    ])
    expect(v.parse(schema, { picks: ['a'], more: [] })).toEqual({ picks: ['a'], more: undefined })
    expect(messages(schema, { picks: true })).toEqual([
      'Invalid type: Expected Array but received true',
    ])
  })

  it('validates with Standard Schema the same way', async () => {
    const schema = builder.build(form({ name: 'a', type: 'text', required: true }))
    const entry = schema.entries.a!

    expect(await entry['~standard'].validate('')).toMatchObject({
      issues: [{ message: 'Required' }],
    })
    expect(await entry['~standard'].validate(undefined)).toMatchObject({
      issues: [{ message: 'Required' }],
    })
    expect(await entry['~standard'].validate('hi')).toMatchObject({ value: 'hi' })
  })
})
