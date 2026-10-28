import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { createSchemaBuilder, defineRule } from './index'
import type { FieldType, JsonField, JsonFormSchema } from './types'

const build = createSchemaBuilder()
const form = (...fields: JsonField[]): JsonFormSchema => ({ version: '1', fields })
const issues = (schema: v.GenericSchema, input: unknown) =>
  v.safeParse(schema, input).issues?.map((i) => i.message) ?? []

describe('createSchemaBuilder', () => {
  it('builds an object schema with one entry per field', () => {
    const schema = build(form({ name: 'a', type: 'text' }, { name: 'b', type: 'password' }))

    expect(Object.keys(schema.entries)).toEqual(['a', 'b'])
  })

  describe('required', () => {
    it('rejects an empty string with the default message', () => {
      const schema = build(form({ name: 'a', type: 'text', required: true }))

      expect(issues(schema, { a: '' })).toEqual(['Required'])
      expect(issues(schema, { a: 'x' })).toEqual([])
    })

    it('uses the custom required message', () => {
      const schema = build(form({ name: 'a', type: 'text', required: { message: 'Fill me' } }))

      expect(issues(schema, { a: '' })).toEqual(['Fill me'])
    })

    it('accepts empty or missing values for optional string fields', () => {
      const schema = build(
        form({ name: 'a', type: 'text', rules: [{ rule: 'minLength', value: 3 }] }),
      )

      expect(issues(schema, {})).toEqual([])
      expect(issues(schema, { a: '' })).toEqual([])
      expect(issues(schema, { a: 'ab' })).not.toEqual([])
    })
  })

  describe('rules', () => {
    it('applies rules with their params and messages', () => {
      const schema = build(
        form({
          name: 'a',
          type: 'text',
          required: true,
          rules: [
            { rule: 'minLength', value: 3, message: 'Too short' },
            { rule: 'regex', pattern: '^[a-z]+$', message: 'Lowercase only' },
          ],
        }),
      )

      expect(issues(schema, { a: 'ab' })).toEqual(['Too short'])
      expect(issues(schema, { a: 'ABC' })).toEqual(['Lowercase only'])
      expect(issues(schema, { a: 'abc' })).toEqual([])
    })

    it('applies field type default rules', () => {
      const schema = build(form({ name: 'a', type: 'email', required: true }))

      expect(issues(schema, { a: 'nope' })).toEqual(['Invalid email'])
    })

    it('lets field rules override field type default rules', () => {
      const schema = build(
        form({
          name: 'a',
          type: 'email',
          required: true,
          rules: [{ rule: 'email', message: 'Bad' }],
        }),
      )

      expect(issues(schema, { a: 'nope' })).toEqual(['Bad'])
    })

    it('throws on unknown rules', () => {
      expect(() => build(form({ name: 'a', type: 'text', rules: [{ rule: 'nope' }] }))).toThrow(
        'fields[0] "a".rules[0]: unknown rule "nope"',
      )
    })

    it('throws when a rule does not support the field kind', () => {
      expect(() => build(form({ name: 'a', type: 'text', rules: [{ rule: 'integer' }] }))).toThrow(
        `rule "integer" can't be used on string fields`,
      )
    })

    it('throws on invalid rule params', () => {
      expect(() =>
        build(form({ name: 'a', type: 'text', rules: [{ rule: 'minLength', value: -1 }] })),
      ).toThrow('invalid params for "minLength"')
    })
  })

  describe('number fields', () => {
    // Vue's v-model on <input type="number"> yields '' once cleared and undefined before input.
    it.each([undefined, ''])('rejects %j when required', (empty) => {
      const schema = build(form({ name: 'n', type: 'number', required: true }))

      expect(issues(schema, { n: empty })).toEqual(['Required'])
    })

    it('uses the custom required message', () => {
      const schema = build(
        form({ name: 'n', type: 'number', required: { message: 'Enter a number' } }),
      )

      expect(issues(schema, { n: '' })).toEqual(['Enter a number'])
    })

    it.each([undefined, ''])('outputs undefined for %j when optional', (empty) => {
      const schema = build(form({ name: 'n', type: 'number' }))

      expect(v.parse(schema, { n: empty })).toEqual({ n: undefined })
    })

    it('rejects non-numbers', () => {
      const schema = build(form({ name: 'n', type: 'number' }))

      expect(issues(schema, { n: 'abc' })).not.toEqual([])
      expect(issues(schema, { n: Number.NaN })).not.toEqual([])
    })

    it('applies number rules', () => {
      const schema = build(
        form({
          name: 'n',
          type: 'number',
          rules: [
            { rule: 'integer', message: 'Whole numbers only' },
            { rule: 'minValue', value: 1, message: 'At least 1' },
            { rule: 'maxValue', value: 10, message: 'At most 10' },
          ],
        }),
      )

      expect(issues(schema, { n: 1.5 })).toEqual(['Whole numbers only'])
      expect(issues(schema, { n: 0 })).toEqual(['At least 1'])
      expect(issues(schema, { n: 11 })).toEqual(['At most 10'])
      expect(v.parse(schema, { n: 5 })).toEqual({ n: 5 })
    })

    it('throws on string rules', () => {
      expect(() =>
        build(form({ name: 'n', type: 'number', rules: [{ rule: 'minLength', value: 1 }] })),
      ).toThrow(`rule "minLength" can't be used on number fields`)
    })
  })

  it('throws on unknown field types', () => {
    expect(() => build(form({ name: 'a', type: 'date' as FieldType }))).toThrow(
      'fields[0] "a": unknown field type "date"',
    )
  })

  it('throws on duplicate field names', () => {
    expect(() => build(form({ name: 'a', type: 'text' }, { name: 'a', type: 'text' }))).toThrow(
      'fields[1]: duplicate name "a"',
    )
  })

  it('accepts custom rules', () => {
    const custom = createSchemaBuilder({
      rules: {
        even: defineRule({
          kinds: ['number'],
          params: v.object({}),
          create: (_, m) => v.check((n: number) => n % 2 === 0, m),
        }),
      },
    })
    const schema = custom(
      form({
        name: 'n',
        type: 'number',
        required: true,
        rules: [{ rule: 'even', message: 'Odd' }],
      }),
    )

    expect(issues(schema, { n: 3 })).toEqual(['Odd'])
    expect(issues(schema, { n: 4 })).toEqual([])
  })

  it('lets custom field types override the defaults', () => {
    const custom = createSchemaBuilder({
      fieldTypes: { text: { kind: 'string', base: (m) => v.pipe(v.string(m), v.trim()) } },
    })
    const schema = custom(form({ name: 'a', type: 'text', required: true }))

    expect(v.parse(schema, { a: '  hi  ' })).toEqual({ a: 'hi' })
  })
})
