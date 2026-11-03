import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  DefinitionError,
  defineFieldType,
  defineFormRule,
  type JsonField,
  type JsonForm,
  type JsonFormRule,
} from '@whatsaaaa/form-builder-schema'

// A consumer container, to show that form rules reach into any container's fields.
const section = defineFieldType({
  kind: 'object',
  container: true,
  props: v.object({ fields: v.array(v.custom<JsonField>(() => true)) }),
  schema: (field, ctx) => ctx.buildFields(field.fields, [...ctx.path, 'fields']),
})

const { build, validate } = createSchemaBuilder({ fieldTypes: { section } })

const fields: JsonField[] = [
  { type: 'heading', text: 'Sign up' },
  { name: 'intro', type: 'paragraph', text: 'Named, but without a value' },
  { name: 'password', type: 'password' },
  { name: 'password2', type: 'password' },
  { name: 'start', type: 'date' },
  { name: 'end', type: 'date' },
  { name: 'seats', type: 'number' },
  { name: 'address', type: 'group', fields: [{ name: 'zip', type: 'text' }] },
  { name: 'billing', type: 'section', fields: [{ name: 'zip', type: 'text' }] },
  { name: 'tags', type: 'array', of: { type: 'text' } },
  {
    name: 'lines',
    type: 'array',
    fields: [
      { name: 'qty', type: 'number' },
      { name: 'max', type: 'number' },
    ],
  },
]

const withRules = (...formRules: JsonFormRule[]): JsonForm => ({ version: '1', fields, formRules })

const codesAndPaths = (json: unknown) =>
  validate(json).issues.map(({ code, path }) => ({ code, path }))

const sameAs = (field: string, other: string): JsonFormRule => ({
  rule: 'sameAs',
  field,
  other,
  message: 'Must match',
})

describe('checking form rules', () => {
  it.each([
    sameAs('password2', 'password'),
    { rule: 'compare', field: 'end', op: 'gt', other: 'start', message: 'After the start' },
    sameAs('address.zip', 'billing.zip'),
    sameAs('lines.*.qty', 'lines.*.max'),
    sameAs('lines.*.qty', 'seats'),
    { rule: 'differentFrom', field: 'tags.*', other: 'password', message: 'Not your password' },
  ])('accepts %j', (rule) => {
    expect(validate(withRules(rule))).toEqual({ success: true, issues: [] })
  })

  it('accepts a definition without form rules', () => {
    expect(validate({ version: '1', fields }).success).toBe(true)
  })

  it('reports form rules that are not a list', () => {
    expect(codesAndPaths({ version: '1', fields, formRules: {} })).toEqual([
      { code: 'invalid_shape', path: ['formRules'] },
    ])
  })

  it.each([
    [{ rule: 'sameAs', other: 'password', message: 'm' }, ['formRules', 0, 'field']],
    [{ rule: 'sameAs', field: 'password2', other: 'password' }, ['formRules', 0, 'message']],
    [{ field: 'password2', other: 'password', message: 'm' }, ['formRules', 0, 'rule']],
  ])('reports %j as invalid_shape', (rule, path) => {
    expect(codesAndPaths({ version: '1', fields, formRules: [rule] })).toEqual([
      { code: 'invalid_shape', path },
    ])
  })

  it('reports an unknown form rule', () => {
    expect(codesAndPaths(withRules({ rule: 'nope', field: 'password', message: 'm' }))).toEqual([
      { code: 'unknown_rule', path: ['formRules', 0, 'rule'] },
    ])
  })

  it('reports unknown and invalid params', () => {
    const json = withRules(
      { ...sameAs('password2', 'password'), foo: 1 },
      { rule: 'compare', field: 'end', op: 'eq', other: 'start', message: 'm' },
    )

    expect(codesAndPaths(json)).toEqual([
      { code: 'unknown_param', path: ['formRules', 0, 'foo'] },
      { code: 'invalid_params', path: ['formRules', 1, 'op'] },
    ])
  })

  it('reports a misspelt other field on the rule', () => {
    const { issues } = validate(withRules(sameAs('password2', 'pasword')))

    expect(issues).toEqual([
      { code: 'unknown_field', path: ['formRules', 0], message: 'Unknown field "pasword"' },
    ])
  })

  it.each(['nope', 'intro', 'address.nope', 'address.*.zip', 'lines.*', 'tags.*.x', ''])(
    'reports the field %j on its key',
    (field) => {
      expect(codesAndPaths(withRules(sameAs(field, 'password')))).toEqual([
        { code: 'unknown_field', path: ['formRules', 0, 'field'] },
      ])
    },
  )

  it('says how to read the fields of a list', () => {
    const message = (field: string) =>
      validate(withRules(sameAs(field, 'seats'))).issues[0]?.message

    expect(message('lines.qty')).toBe(
      'Unknown field "lines.qty". A list\'s items are read with "*": "lines.*.qty"',
    )
    expect(message('lines.*')).toBe('Unknown field "lines.*"')
  })

  it("reports a path into a list's items when the field isn't in them", () => {
    const { issues } = validate(
      withRules(sameAs('seats', 'lines.*.qty'), sameAs('seats', 'lines.*.x')),
    )

    expect(issues).toEqual([
      {
        code: 'unknown_field',
        path: ['formRules', 0],
        message: '"lines.*.qty" is read from each item of "lines", so "seats" must be too',
      },
      { code: 'unknown_field', path: ['formRules', 1], message: 'Unknown field "lines.*.x"' },
    ])
  })

  it('says nothing more about a field with issues of its own', () => {
    const json: JsonForm = {
      version: '1',
      fields: [
        { name: 'password', type: 'password', rules: [{ rule: 'nope' }] },
        { name: 'password2', type: 'password' },
        { name: 'address', type: 'group', fields: 'nope' },
      ],
      formRules: [sameAs('password2', 'password'), sameAs('address.zip', 'password2')],
    }

    expect(codesAndPaths(json)).toEqual([
      { code: 'unknown_rule', path: ['fields', 0, 'rules', 0, 'rule'] },
      { code: 'invalid_props', path: ['fields', 2, 'fields'] },
    ])
  })

  it.each([
    [{ rule: 'compare', field: 'password2', op: 'lt', other: 'password', message: 'm' }, 'string'],
    [sameAs('address', 'billing'), 'object'],
    [sameAs('tags', 'lines'), 'array'],
  ])('reports %j as kind_mismatch', (rule, kind) => {
    const { issues } = validate(withRules(rule))

    expect(issues).toEqual([
      {
        code: 'kind_mismatch',
        path: ['formRules', 0, 'rule'],
        message: `Form rule "${rule.rule}" can't be used on ${kind} fields`,
      },
    ])
  })

  it('reports fields of different kinds when the rule needs one kind', () => {
    const { issues } = validate(
      withRules({ rule: 'compare', field: 'end', op: 'gt', other: 'seats', message: 'm' }),
    )

    expect(issues).toEqual([
      {
        code: 'kind_mismatch',
        path: ['formRules', 0, 'rule'],
        message: 'Form rule "compare" needs fields of one kind, not date and number',
      },
    ])
  })

  it('checks your own form rules, with any kind when they list none', () => {
    const sameZip = defineFormRule({
      params: v.object({ others: v.array(v.string()) }),
      reads: (params) => params.others,
      check: (values) => new Set(values).size === 1,
    })
    const { validate } = createSchemaBuilder({ fieldTypes: { section }, formRules: { sameZip } })
    const rule = { rule: 'sameZip', field: 'address', message: 'm' }

    expect(validate(withRules({ ...rule, others: ['billing', 'tags'] })).success).toBe(true)
    expect(
      validate(withRules({ ...rule, others: ['billing', 'nope', 'x.y'] })).issues,
    ).toMatchObject([
      { code: 'unknown_field', path: ['formRules', 0], message: 'Unknown field "nope"' },
      { code: 'unknown_field', path: ['formRules', 0], message: 'Unknown field "x.y"' },
    ])
  })

  it('reports form rule issues after the field issues, and build() throws them', () => {
    const json: JsonForm = {
      version: '1',
      fields: [{ name: 'a', type: 'nope' }, ...fields],
      formRules: [sameAs('password2', 'pasword')],
    }

    expect(codesAndPaths(json)).toEqual([
      { code: 'unknown_type', path: ['fields', 0, 'type'] },
      { code: 'unknown_field', path: ['formRules', 0] },
    ])
    expect(() => build(json)).toThrow(DefinitionError)
    expect(() => build(json)).toThrow('formRules[0]: Unknown field "pasword"')
  })
})
