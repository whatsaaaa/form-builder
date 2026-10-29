import * as v from 'valibot'
import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  createSchemaBuilder,
  defineFieldType,
  defineRule,
  type JsonField,
} from '@whatsaaaa/form-builder-schema'
import { form, messages } from '../helpers'

describe('extending the builder', () => {
  it('builds a field of a consumer type with a consumer kind', () => {
    const { build } = createSchemaBuilder({
      kinds: { money: { isEmpty: (input) => input === undefined || input === 0 } },
      fieldTypes: { price: { kind: 'money', schema: () => v.number() } },
      rules: {
        even: defineRule({
          kinds: ['money'],
          create: (_, m) => v.check((n: number) => n % 2 === 0, m),
        }),
      },
    })
    const schema = build(
      form({ name: 'p', type: 'price', required: true, rules: [{ rule: 'even', message: 'Odd' }] }),
    )

    expect(messages(schema, { p: 0 })).toEqual(['Required'])
    expect(messages(schema, { p: 3 })).toEqual(['Odd'])
    expect(messages(schema, { p: 4 })).toEqual([])
  })

  it('accepts any type name in a JsonField', () => {
    const field: JsonField = { name: 'd', type: 'date' }

    expect(field.type).toBe('date')
  })

  it('types and validates field type props', () => {
    const select = defineFieldType({
      kind: 'string',
      props: v.object({ options: v.array(v.string()) }),
      schema: (field) => {
        expectTypeOf(field.options).toEqualTypeOf<string[]>()
        return v.pipe(
          v.string(),
          v.check((input) => field.options.includes(input), 'Pick an option'),
        )
      },
    })
    const { build, validate } = createSchemaBuilder({ fieldTypes: { select } })
    const schema = build(form({ name: 's', type: 'select', options: ['a', 'b'] }))

    expect(messages(schema, { s: 'c' })).toEqual(['Pick an option'])
    expect(messages(schema, { s: 'a' })).toEqual([])
    expect(validate(form({ name: 's', type: 'select', options: 'a' })).issues).toMatchObject([
      { code: 'invalid_props', path: ['fields', 0, 'options'] },
    ])
  })

  it('adds no output key for fields without a value', () => {
    const { build } = createSchemaBuilder({ fieldTypes: { heading: { kind: 'none' } } })
    const schema = build(form({ type: 'heading', label: 'About you' }, { name: 'a', type: 'text' }))

    expect(Object.keys(schema.entries)).toEqual(['a'])
  })

  it('lets consumer field types replace the defaults', () => {
    const { build } = createSchemaBuilder({
      fieldTypes: { text: { kind: 'string', schema: () => v.pipe(v.string(), v.toUpperCase()) } },
    })

    expect(v.parse(build(form({ name: 'a', type: 'text' })), { a: 'hi' })).toEqual({ a: 'HI' })
  })

  it('exposes the merged registries', () => {
    const { kinds, fieldTypes, rules } = createSchemaBuilder({
      fieldTypes: { heading: { kind: 'none' } },
    })

    expect(Object.keys(kinds)).toContain('string')
    expect(Object.keys(fieldTypes)).toEqual(['text', 'password', 'email', 'number', 'heading'])
    expect(Object.keys(rules)).toContain('trim')
    expect(Object.isFrozen(rules)).toBe(true)
  })

  describe('throws a TypeError for registry mistakes', () => {
    it.each([
      [
        'a rule param named message',
        {
          rules: {
            bad: defineRule({
              kinds: ['string'],
              params: v.object({ message: v.string() }),
              create: () => v.trim(),
            }),
          },
        },
      ],
      [
        'a field type with an unknown kind',
        { fieldTypes: { money: { kind: 'money', schema: () => v.number() } } },
      ],
      ['a value field type without schema()', { fieldTypes: { text: { kind: 'string' } } }],
      [
        'a props key that is reserved',
        {
          fieldTypes: {
            x: { kind: 'string', props: v.object({ label: v.string() }), schema: () => v.string() },
          },
        },
      ],
      [
        'a default rule that does not exist',
        {
          fieldTypes: {
            x: { kind: 'string', schema: () => v.string(), defaultRules: [{ rule: 'nope' }] },
          },
        },
      ],
    ])('%s', (_, options) => {
      expect(() => createSchemaBuilder(options)).toThrow(TypeError)
    })
  })
})
