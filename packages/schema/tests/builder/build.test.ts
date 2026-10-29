import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { form, messages } from '../helpers'

const { build } = createSchemaBuilder()

describe('build', () => {
  it('builds an object schema with one entry per field', () => {
    const schema = build(form({ name: 'a', type: 'text' }, { name: 'b', type: 'password' }))

    expect(Object.keys(schema.entries)).toEqual(['a', 'b'])
  })

  describe('required', () => {
    it.each(['', undefined, null])('gives only the required message for text %j', (input) => {
      const schema = build(
        form({ name: 'a', type: 'text', required: true, rules: [{ rule: 'minLength', value: 3 }] }),
      )

      expect(messages(schema, { a: input })).toEqual(['Required'])
      expect(messages(schema, { a: 'abc' })).toEqual([])
    })

    it("treats '   ' with trim as empty", () => {
      const schema = build(
        form({ name: 'a', type: 'text', required: true, rules: [{ rule: 'trim' }] }),
      )

      expect(messages(schema, { a: '   ' })).toEqual(['Required'])
      expect(v.parse(schema, { a: '  hi  ' })).toEqual({ a: 'hi' })
    })

    it('uses the custom required message', () => {
      const schema = build(form({ name: 'a', type: 'text', required: { message: 'Fill me' } }))

      expect(messages(schema, { a: '' })).toEqual(['Fill me'])
    })

    // Vue's v-model on <input type="number"> yields '' once cleared and undefined before input.
    it.each(['', undefined, Number.NaN])(
      'gives only the required message for number %j',
      (input) => {
        const schema = build(form({ name: 'n', type: 'number', required: true }))

        expect(messages(schema, { n: input })).toEqual(['Required'])
      },
    )

    it('accepts only real numbers', () => {
      const schema = build(form({ name: 'n', type: 'number', required: true }))

      expect(messages(schema, { n: '5' })).toHaveLength(1)
      expect(messages(schema, { n: '5' })).not.toEqual(['Required'])
      expect(messages(schema, { n: 5 })).toEqual([])
    })

    it('requires a boolean to be true', () => {
      const { build } = createSchemaBuilder({
        fieldTypes: { checkbox: { kind: 'boolean', schema: () => v.boolean() } },
      })
      const schema = build(form({ name: 'terms', type: 'checkbox', required: true }))

      expect(messages(schema, { terms: false })).toEqual(['Required'])
      expect(messages(schema, { terms: true })).toEqual([])
    })
  })

  describe('optional', () => {
    it('outputs undefined for empty text and number, and skips the rules', () => {
      const schema = build(
        form(
          { name: 'a', type: 'text', rules: [{ rule: 'minLength', value: 3 }] },
          { name: 'n', type: 'number', rules: [{ rule: 'minValue', value: 1 }] },
        ),
      )

      expect(v.parse(schema, { a: '', n: '' })).toEqual({ a: undefined, n: undefined })
      expect(messages(schema, {})).toEqual([])
      expect(messages(schema, { a: 'ab' })).toHaveLength(1)
    })

    it("outputs undefined for '   ' with trim", () => {
      const schema = build(
        form({
          name: 'a',
          type: 'text',
          rules: [{ rule: 'trim' }, { rule: 'minLength', value: 3 }],
        }),
      )

      expect(v.parse(schema, { a: '   ' })).toEqual({ a: undefined })
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

      expect(messages(schema, { a: 'ab' })).toEqual(['Too short'])
      expect(messages(schema, { a: 'AB' })).toEqual(['Too short', 'Lowercase only'])
      expect(messages(schema, { a: 'abc' })).toEqual([])
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

      expect(messages(schema, { n: 1.5 })).toEqual(['Whole numbers only'])
      expect(messages(schema, { n: 0 })).toEqual(['At least 1'])
      expect(messages(schema, { n: 11 })).toEqual(['At most 10'])
      expect(v.parse(schema, { n: 5 })).toEqual({ n: 5 })
    })

    it("uses Valibot's message for the email type's default rule", () => {
      const schema = build(form({ name: 'a', type: 'email', required: true }))

      expect(messages(schema, { a: 'nope' })).toEqual(['Invalid email: Received "nope"'])
    })

    it("lets field rules override the type's default rules", () => {
      const schema = build(
        form({
          name: 'a',
          type: 'email',
          required: true,
          rules: [{ rule: 'email', message: 'Bad' }],
        }),
      )

      expect(messages(schema, { a: 'nope' })).toEqual(['Bad'])
    })
  })

  describe('messages', () => {
    it('changes the default required message', () => {
      const { build } = createSchemaBuilder({ messages: { required: 'Obavezno' } })
      const schema = build(form({ name: 'a', type: 'text', required: true }))

      expect(messages(schema, { a: '' })).toEqual(['Obavezno'])
    })

    it('passes every message through resolveMessage', () => {
      const texts: Record<string, string> = { 'errors.email': 'Ungültig', Required: 'Pflichtfeld' }
      const { build } = createSchemaBuilder({ resolveMessage: (key) => texts[key] })
      const schema = build(
        form(
          {
            name: 'a',
            type: 'text',
            required: true,
            rules: [{ rule: 'email', message: 'errors.email' }],
          },
          { name: 'b', type: 'text', required: { message: 'Written as is' } },
        ),
      )

      expect(messages(schema, { a: '', b: 'x' })).toEqual(['Pflichtfeld'])
      expect(messages(schema, { a: 'nope', b: 'x' })).toEqual(['Ungültig'])
      expect(messages(schema, { a: 'a@b.co', b: '' })).toEqual(['Written as is'])
    })
  })
})
