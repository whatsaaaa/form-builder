import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { createSchemaBuilder, type JsonField } from '@whatsaaaa/form-builder-schema'
import { form, messages } from '../helpers'

const { build, validate } = createSchemaBuilder({
  fieldTypes: {
    day: { kind: 'date', schema: () => v.string() },
    tags: { kind: 'array', schema: () => v.array(v.union([v.string(), v.number()])) },
  },
})

const issues = (...fields: JsonField[]) =>
  validate(form(...fields)).issues.map(({ code, path }) => ({ code, path }))

describe('rules that need extra care', () => {
  describe('length and content on arrays', () => {
    it('counts the items of an array', () => {
      const schema = build(
        form({ name: 't', type: 'tags', rules: [{ rule: 'minLength', value: 2 }] }),
      )

      expect(messages(schema, { t: ['a'] })).toHaveLength(1)
      expect(messages(schema, { t: ['a', 'b'] })).toEqual([])
    })

    it('checks for an item with includes', () => {
      const schema = build(
        form({ name: 't', type: 'tags', rules: [{ rule: 'includes', value: 1 }] }),
      )

      expect(messages(schema, { t: [1, 2] })).toEqual([])
      expect(messages(schema, { t: ['1'] })).toHaveLength(1)
    })
  })

  describe('regex', () => {
    it('reports a pattern RegExp rejects, with its error text', () => {
      const [issue] = validate(
        form({ name: 'a', type: 'text', rules: [{ rule: 'regex', pattern: '(' }] }),
      ).issues

      expect(issue).toMatchObject({
        code: 'invalid_params',
        path: ['fields', 0, 'rules', 0, 'pattern'],
      })
      expect(issue?.message).toMatch(/regular expression/i)
    })

    it('reports unknown flags', () => {
      expect(
        issues({ name: 'a', type: 'text', rules: [{ rule: 'regex', pattern: 'a', flags: 'x' }] }),
      ).toEqual([{ code: 'invalid_params', path: ['fields', 0, 'rules', 0, 'flags'] }])
    })

    it('checks the pattern together with its flags', () => {
      // \q is a plain "q" without the u flag, and an error with it.
      expect(
        issues({ name: 'a', type: 'text', rules: [{ rule: 'regex', pattern: '\\q' }] }),
      ).toEqual([])
      expect(
        issues({ name: 'a', type: 'text', rules: [{ rule: 'regex', pattern: '\\q', flags: 'u' }] }),
      ).toEqual([{ code: 'invalid_params', path: ['fields', 0, 'rules', 0, 'pattern'] }])
    })

    it('applies flags, and ignores g so every value is checked from the start', () => {
      const schema = build(
        form({ name: 'a', type: 'text', rules: [{ rule: 'regex', pattern: '^ab', flags: 'gi' }] }),
      )

      expect(messages(schema, { a: 'AB' })).toEqual([])
      expect(messages(schema, { a: 'AB' })).toEqual([])
      expect(messages(schema, { a: 'ba' })).toHaveLength(1)
    })
  })

  describe('comparison params follow the kind', () => {
    it('takes a number on a number field and an ISO string on a date field', () => {
      const schema = build(
        form(
          { name: 'n', type: 'number', rules: [{ rule: 'minValue', value: 3 }] },
          { name: 'd', type: 'day', rules: [{ rule: 'minValue', value: '2026-01-01' }] },
        ),
      )

      expect(messages(schema, { n: 2, d: '2025-12-31' })).toHaveLength(2)
      expect(messages(schema, { n: 3, d: '2026-01-01' })).toEqual([])
    })

    it('rejects a param of the wrong type', () => {
      expect(
        issues(
          { name: 'n', type: 'number', rules: [{ rule: 'minValue', value: '2026-01-01' }] },
          { name: 'd', type: 'day', rules: [{ rule: 'minValue', value: 3 }] },
          { name: 'e', type: 'day', rules: [{ rule: 'minValue', value: '1 Jan 2026' }] },
        ),
      ).toEqual([
        { code: 'invalid_params', path: ['fields', 0, 'rules', 0, 'value'] },
        { code: 'invalid_params', path: ['fields', 1, 'rules', 0, 'value'] },
        { code: 'invalid_params', path: ['fields', 2, 'rules', 0, 'value'] },
      ])
    })

    it('needs at least one value for values and notValues', () => {
      expect(
        issues({ name: 'n', type: 'number', rules: [{ rule: 'values', values: [] }] }),
      ).toEqual([{ code: 'invalid_params', path: ['fields', 0, 'rules', 0, 'values'] }])
    })

    it('compares strings and booleans with value', () => {
      const { build } = createSchemaBuilder({
        fieldTypes: { flag: { kind: 'boolean', schema: () => v.boolean() } },
      })
      const schema = build(
        form(
          { name: 's', type: 'text', rules: [{ rule: 'value', value: 'yes' }] },
          { name: 'b', type: 'flag', rules: [{ rule: 'notValue', value: true }] },
        ),
      )

      expect(messages(schema, { s: 'yes', b: false })).toEqual([])
      expect(messages(schema, { s: 'no', b: true })).toHaveLength(2)
    })
  })

  describe('hash', () => {
    it('takes only Valibot hash types', () => {
      expect(
        issues({ name: 'h', type: 'text', rules: [{ rule: 'hash', types: ['sha256', 'nope'] }] }),
      ).toEqual([{ code: 'invalid_params', path: ['fields', 0, 'rules', 0, 'types', 1] }])
    })
  })
})
