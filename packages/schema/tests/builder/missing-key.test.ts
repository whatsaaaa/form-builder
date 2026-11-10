import { toJsonSchema } from '@valibot/to-json-schema'
import * as v from 'valibot'
import { afterEach, describe, expect, expectTypeOf, it } from 'vitest'
import {
  createSchemaBuilder,
  issuesOfStep,
  type JsonField,
  type JsonForm,
  type BuiltSchema,
} from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'
import { hideWhen } from '../extensions/hide-when'

const builder = createSchemaBuilder()

/** Each issue's message and its dot path. */
const issuesOf = (schema: v.GenericSchema, input: unknown) =>
  v.safeParse(schema, input).issues?.map((issue) => ({
    path: issue.path?.map((item) => item.key).join('.') ?? '',
    message: issue.message,
  })) ?? []

const contact = form(
  { name: 'email', type: 'email', required: { message: 'Email is required' } },
  { name: 'age', type: 'number', required: true },
  { name: 'nick', type: 'text' },
)

describe('a required field whose key is missing', () => {
  it('gets its required message, the same as one whose value is undefined', () => {
    const schema = builder.build(contact)

    expect(issuesOf(schema, {})).toEqual([
      { path: 'email', message: 'Email is required' },
      { path: 'age', message: 'Required' },
    ])
    expect(issuesOf(schema, { email: undefined, age: undefined })).toEqual(issuesOf(schema, {}))
  })

  it('gets the required message of the builder and resolveMessage', () => {
    const resolved = createSchemaBuilder({
      messages: { required: 'required' },
      resolveMessage: (key) => `t(${key})`,
    })

    expect(issuesOf(resolved.build(contact), {})).toEqual([
      { path: 'email', message: 't(Email is required)' },
      { path: 'age', message: 't(required)' },
    ])
  })

  it('gets it in a group, in the items of a list and in lists inside lists', () => {
    const city: JsonField = { name: 'city', type: 'text', required: { message: 'City?' } }
    const schema = builder.build(
      form(
        { name: 'address', type: 'group', fields: [city] },
        {
          name: 'lines',
          type: 'array',
          fields: [
            { name: 'product', type: 'text', required: true },
            { name: 'parts', type: 'array', fields: [city] },
          ],
        },
      ),
    )

    expect(issuesOf(schema, {})).toEqual([{ path: 'address.city', message: 'City?' }])
    expect(issuesOf(schema, { address: { city: 'X' }, lines: [{ parts: [{}] }] })).toEqual([
      { path: 'lines.0.product', message: 'Required' },
      { path: 'lines.0.parts.0.city', message: 'City?' },
    ])
  })

  it('gets it with form rules too', () => {
    const schema = builder.build({
      ...contact,
      formRules: [{ rule: 'sameAs', field: 'nick', other: 'email', message: 'Differs' }],
    })

    expect(issuesOf(schema, { nick: 'x' })).toEqual([
      { path: 'email', message: 'Email is required' },
      { path: 'age', message: 'Required' },
    ])
  })

  it('gets it on the step it is in', () => {
    const json: JsonForm = {
      ...contact,
      layout: { steps: [{ items: ['email'] }, { items: ['age', 'nick'] }] },
    }
    const [one, two] = builder.getLayout(json).steps
    const issues = v.safeParse(builder.build(json), {}).issues

    expect(issuesOfStep(one!, issues).map(({ issue }) => issue.message)).toEqual([
      'Email is required',
    ])
    expect(issuesOfStep(two!, issues).map(({ issue }) => issue.message)).toEqual(['Required'])
  })

  it('reports nothing while conditions hide it, and its required message when shown', () => {
    const conditional = createSchemaBuilder({ extensions: [hideWhen()] })
    const schema = conditional.build(
      form(
        { name: 'person', type: 'checkbox' },
        {
          name: 'company',
          type: 'text',
          required: { message: 'Company?' },
          hideWhen: { field: 'person' },
        },
        {
          name: 'billing',
          type: 'group',
          hideWhen: { field: 'person' },
          fields: [{ name: 'vat', type: 'text', required: true }],
        },
      ),
    )

    expect(v.parse(schema, { person: true })).toEqual({ person: true, billing: {} })
    expect(issuesOf(schema, {})).toEqual([
      { path: 'company', message: 'Company?' },
      { path: 'billing.vat', message: 'Required' },
    ])
  })
})

describe('the other issues of a list of fields', () => {
  afterEach(() => {
    v.deleteSpecificMessage(v.object)
    v.deleteSchemaMessage()
    v.deleteGlobalMessage()
    v.deleteSpecificMessage(v.object, 'de')
  })

  const schema = builder.build(
    form({ name: 'address', type: 'group', fields: [{ name: 'city', type: 'text' }] }),
  )

  it("get Valibot's message", () => {
    expect(issuesOf(schema, null)).toEqual([
      { path: '', message: 'Invalid type: Expected Object but received null' },
    ])
    expect(issuesOf(schema, { address: 1 })).toEqual([
      { path: 'address', message: 'Invalid type: Expected Object but received 1' },
    ])
  })

  it('get the message you set for Valibot, in that order', () => {
    v.setGlobalMessage('global')
    expect(issuesOf(schema, null)).toEqual([{ path: '', message: 'global' }])
    v.setSchemaMessage('schema')
    expect(issuesOf(schema, null)).toEqual([{ path: '', message: 'schema' }])
    v.setSpecificMessage(v.object, (issue) => `object: ${issue.received}`)
    expect(issuesOf(schema, null)).toEqual([{ path: '', message: 'object: null' }])
    v.setSpecificMessage(v.object, 'objekt', 'de')
    expect(v.safeParse(schema, null, { lang: 'de' }).issues?.[0]?.message).toBe('objekt')
  })

  it('give the field its required message over the messages set for Valibot', () => {
    v.setSpecificMessage(v.object, 'object')
    v.setGlobalMessage('global')

    expect(issuesOf(builder.build(contact), {})).toEqual([
      { path: 'email', message: 'Email is required' },
      { path: 'age', message: 'Required' },
    ])
  })

  // Valibot uses a schema's own message before the `message` of a parse's config, so that one
  // never reaches the issues of a list's object. It still reaches the issues of the fields.
  it("don't get the message from a parse's config", () => {
    const parse = (input: unknown) =>
      v.safeParse(schema, input, { message: 'config' }).issues?.map((issue) => issue.message)

    expect(parse(null)).toEqual(['Invalid type: Expected Object but received null'])
    expect(parse({ address: 1 })).toEqual(['Invalid type: Expected Object but received 1'])
    expect(parse({ address: { city: 1 } })).toEqual(['config'])
  })
})

describe('the schema Formisch and JSON Schema converters read', () => {
  const schema = builder.build(
    form(...contact.fields, {
      name: 'address',
      type: 'group',
      fields: [{ name: 'city', type: 'text', required: true }],
    }),
  )

  it('keeps its type', () => {
    expectTypeOf(schema).toEqualTypeOf<BuiltSchema>()
    expectTypeOf<Extract<BuiltSchema, { type: 'object' }>['message']>().toEqualTypeOf<undefined>()
  })

  it('stays an object schema with the same entries and the same JSON Schema', () => {
    expect(schema.type).toBe('object')
    expect(Object.keys(schema.entries)).toEqual(['email', 'age', 'nick', 'address'])
    // Taken before the required messages were added, so they change nothing a converter reads.
    expect(toJsonSchema(schema, { errorMode: 'ignore' })).toMatchInlineSnapshot(`
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "properties": {
          "address": {
            "default": {},
            "properties": {
              "city": {},
            },
            "required": [
              "city",
            ],
            "type": "object",
          },
          "age": {},
          "email": {},
          "nick": {
            "type": "string",
          },
        },
        "required": [
          "email",
          "age",
        ],
        "type": "object",
      }
    `)
  })
})
