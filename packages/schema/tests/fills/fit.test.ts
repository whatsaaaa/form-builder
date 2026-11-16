import * as v from 'valibot'
import { describe, expect, it, vi } from 'vitest'
import {
  createSchemaBuilder,
  defineFieldType,
  defineRule,
  type JsonField,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { openForm, prefill } from './prefill'

/** A field type whose schema is async, like one with a check that asks a server. */
const asyncText = defineFieldType({
  kind: 'string',
  schema: () =>
    v.pipeAsync(
      v.string(),
      v.checkAsync(async () => true),
    ) as unknown as v.GenericSchema<string>,
})

/** A rule that asks a server. */
const available = defineRule({
  kinds: ['string'],
  create: () => v.checkAsync(async () => true, 'Taken') as never,
})

const fields: JsonField[] = [
  { name: 'name', type: 'text', required: true, rules: [{ rule: 'minLength', value: 3 }] },
  { name: 'zip', type: 'text' },
  { name: 'email', type: 'email' },
  { name: 'age', type: 'number', required: true },
  {
    name: 'plan',
    type: 'select',
    options: [
      { value: 'free', label: 'Free' },
      { value: 'pro', label: 'Pro' },
    ],
  },
  {
    name: 'days',
    type: 'multiselect',
    options: [
      { value: '1', label: 'Monday' },
      { value: '2', label: 'Tuesday' },
    ],
  },
  { name: 'born', type: 'date' },
  { name: 'terms', type: 'checkbox', required: true },
  { name: 'code', type: 'asyncText', required: true },
  { name: 'user', type: 'text', rules: [{ rule: 'available' }] },
]

const paths = fields.map((field) => field.name as string)

/** The input and the errors a fill gives each field for `values`. */
function fill(values: Record<string, unknown>) {
  const onError = vi.fn()
  const builder = createSchemaBuilder({
    fieldTypes: { asyncText },
    rules: { available },
    extensions: [prefill({ values: () => values })],
  })
  const json: JsonForm = {
    version: '1',
    fields: [
      { name: 'go', type: 'checkbox', prefill: { source: 'values', fields: paths } },
      ...fields,
    ],
  } as never
  const form = openForm(builder, json, { onError })
  form.type('go', true)
  const errors = onError.mock.calls.map(
    ([error, info]) => `${(info as { field: string }).field}: ${(error as Error).message}`,
  )
  const { go: _, ...input } = form.input
  return { input, errors }
}

describe('fitting a value to its field', () => {
  it('blanks a field for null, undefined and empty values, even a required one', () => {
    const blank = fill({ name: null, zip: '', age: '', days: [], born: undefined })
    expect(blank.errors).toEqual([])
    expect(blank.input).toEqual({})
  })

  it('reads a value as an input element would, and a number as text for a text field', () => {
    const { input, errors } = fill({ zip: 11000, age: '42', days: [2, '1'], terms: true })
    expect(errors).toEqual([])
    expect(input).toMatchObject({ zip: '11000', age: 42, days: ['2', '1'], terms: true })
  })

  it("blanks a value of a type the field can't hold, and reports it", () => {
    const { input, errors } = fill({
      name: true,
      age: 'abc',
      plan: 'gold',
      days: ['3'],
      born: 20260101,
      terms: 'true',
    })
    expect(input).toEqual({})
    expect(errors).toEqual([
      'name: "name" can\'t hold true: Invalid type: Expected string but received true',
      'age: "age" can\'t hold "abc": Invalid type: Expected number but received "abc"',
      'plan: "plan" can\'t hold "gold": Invalid type: Expected ("free" | "pro") but received "gold"',
      'days: "days" can\'t hold ["3"]: Invalid type: Expected ("1" | "2") but received "3"',
      'born: "born" can\'t hold 20260101: Invalid type: Expected string but received 20260101',
      'terms: "terms" can\'t hold "true": Invalid type: Expected boolean but received "true"',
    ])
    // A value JSON can't write is shown as text.
    expect(fill({ zip: 10n }).errors).toEqual([
      'zip: "zip" can\'t hold 10: Invalid type: Expected string but received 10',
    ])
  })

  it('sets a value that only breaks a rule, so the form shows its error', () => {
    const values = { name: 'Al', email: 'marko', born: '2026-13-45', terms: false }
    const { input, errors } = fill(values)
    expect(errors).toEqual([])
    expect(input).toMatchObject(values)
  })

  it('sets the value of a field with an async part unchecked, as it can only run async', () => {
    const { input, errors } = fill({ code: 'RS-11000', user: 'marko' })
    expect(errors).toEqual([])
    expect(input).toMatchObject({ code: 'RS-11000', user: 'marko' })
  })
})
