import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { createSchemaBuilder, defineFieldType, defineRule } from '@whatsaaaa/form-builder-schema'
import { form, messages } from '../helpers'

// A list of numbers or strings, picked by a prop, to test kinds that depend on the field.
const list = defineFieldType({
  kind: 'array',
  itemKind: (field) => field.of,
  props: v.object({ of: v.picklist(['number', 'string']) }),
  schema: (field) => v.array(field.of === 'number' ? v.number() : v.string()),
})

const amount = defineFieldType({
  kind: (field) => field.as,
  props: v.object({ as: v.picklist(['number', 'string']) }),
  schema: (field) => (field.as === 'number' ? v.number() : v.string()),
})

const { build, validate } = createSchemaBuilder({ fieldTypes: { list, amount } })

const issues = (...fields: Parameters<typeof form>) =>
  validate(form(...fields)).issues.map(({ code, path }) => ({ code, path }))

describe('field type definitions', () => {
  describe('kind from a function', () => {
    it('picks the rules that fit the kind the field gets', () => {
      expect(
        issues(
          { name: 'a', type: 'amount', as: 'number', rules: [{ rule: 'minValue', value: 1 }] },
          { name: 'b', type: 'amount', as: 'string', rules: [{ rule: 'minLength', value: 1 }] },
          { name: 'c', type: 'amount', as: 'string', rules: [{ rule: 'minValue', value: 1 }] },
        ),
      ).toEqual([{ code: 'kind_mismatch', path: ['fields', 2, 'rules', 0, 'rule'] }])
    })

    it('checks only the props when they are invalid', () => {
      expect(issues({ name: 'a', type: 'amount', as: 'date', rules: [{ rule: 'nope' }] })).toEqual([
        { code: 'invalid_props', path: ['fields', 0, 'as'] },
      ])
    })

    it('uses the empty check of the kind the field gets', () => {
      const schema = build(form({ name: 'a', type: 'amount', as: 'number', required: true }))

      expect(messages(schema, { a: Number.NaN })).toEqual(['Required'])
    })

    it('throws a TypeError for a kind nobody registered', () => {
      const { validate } = createSchemaBuilder({
        fieldTypes: { odd: defineFieldType({ kind: () => 'money', schema: () => v.number() }) },
      })

      expect(() => validate(form({ name: 'a', type: 'odd' }))).toThrow(TypeError)
    })

    it("throws a TypeError for a kind() that returns 'none'", () => {
      const { validate } = createSchemaBuilder({
        fieldTypes: { odd: defineFieldType({ kind: () => 'none', schema: () => v.string() }) },
      })

      expect(() => validate(form({ name: 'a', type: 'odd' }))).toThrow("kind() can't return 'none'")
    })

    it('throws a TypeError for a default rule that does not fit the kind', () => {
      const { validate } = createSchemaBuilder({
        fieldTypes: {
          odd: defineFieldType({
            kind: () => 'number',
            schema: () => v.number(),
            defaultRules: [{ rule: 'email' }],
          }),
        },
      })

      expect(() => validate(form({ name: 'a', type: 'odd' }))).toThrow(TypeError)
    })
  })

  describe('rules on each item', () => {
    it('runs item rules on each item and array rules on the array', () => {
      const schema = build(
        form({
          name: 'n',
          type: 'list',
          of: 'number',
          rules: [
            { rule: 'minValue', value: 1, message: 'Too small' },
            { rule: 'maxLength', value: 2, message: 'Too many' },
          ],
        }),
      )

      expect(messages(schema, { n: [1, 2] })).toEqual([])
      expect(messages(schema, { n: [0, 2, 3] })).toEqual(['Too small', 'Too many'])
      expect(messages(schema, { n: [0, -1] })).toEqual(['Too small', 'Too small'])
    })

    it('reports item issues on the field, not on the items', () => {
      const schema = build(
        form({ name: 'n', type: 'list', of: 'number', rules: [{ rule: 'minValue', value: 1 }] }),
      )
      const result = v.safeParse(schema, { n: [5, 0] })

      expect(result.issues?.map((issue) => v.getDotPath(issue))).toEqual(['n'])
    })

    it("reports an item issue with the rule's own message", () => {
      const schema = build(
        form({ name: 'n', type: 'list', of: 'string', rules: [{ rule: 'email' }] }),
      )

      expect(messages(schema, { n: ['a@b.co', 'nope'] })).toEqual([
        'Invalid email: Received "nope"',
      ])
    })

    it('checks item params against the item kind', () => {
      expect(
        issues(
          { name: 'a', type: 'list', of: 'number', rules: [{ rule: 'minValue', value: 'x' }] },
          { name: 'b', type: 'list', of: 'string', rules: [{ rule: 'email' }] },
          { name: 'c', type: 'list', of: 'number', rules: [{ rule: 'email' }] },
        ),
      ).toEqual([
        { code: 'invalid_params', path: ['fields', 0, 'rules', 0, 'value'] },
        { code: 'kind_mismatch', path: ['fields', 2, 'rules', 0, 'rule'] },
      ])
    })

    it('runs normalize rules on each item', () => {
      const schema = build(
        form({ name: 's', type: 'list', of: 'string', rules: [{ rule: 'trim' }] }),
      )

      expect(v.parse(schema, { s: [' a ', 'b '] })).toEqual({ s: ['a', 'b'] })
    })
  })

  it("lets a type replace its kind's required check", () => {
    const answer = defineFieldType({
      kind: 'boolean',
      schema: () => v.boolean(),
      required: () => null,
    })
    const { build } = createSchemaBuilder({ fieldTypes: { answer } })
    const schema = build(form({ name: 'a', type: 'answer', required: true }))

    expect(messages(schema, { a: false })).toEqual([])
    expect(messages(schema, { a: undefined })).toEqual(['Required'])
  })

  it('runs finalize after every rule', () => {
    const seen: unknown[] = []
    const shout = defineFieldType({
      kind: 'string',
      schema: () => v.string(),
      finalize: () => v.toUpperCase(),
    })
    const { build } = createSchemaBuilder({
      fieldTypes: { shout },
      rules: {
        spy: defineRule({
          kinds: ['string'],
          create: () =>
            v.check((input: string) => {
              seen.push(input)
              return true
            }),
        }),
      },
    })
    const schema = build(form({ name: 's', type: 'shout', rules: [{ rule: 'spy' }] }))

    expect(v.parse(schema, { s: 'hi' })).toEqual({ s: 'HI' })
    expect(seen).toEqual(['hi'])
  })
})
