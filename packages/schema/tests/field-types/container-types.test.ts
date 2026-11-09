import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { form, messages } from '../helpers'

const { build, validate } = createSchemaBuilder()

const issues = (...fields: Parameters<typeof form>) =>
  validate(form(...fields)).issues.map(({ code, path }) => ({ code, path }))

/** The dot paths Valibot reports issues at. Formisch uses the same paths for its fields. */
const paths = (schema: v.GenericSchema, input: unknown) =>
  v.safeParse(schema, input).issues?.map((issue) => v.getDotPath(issue)) ?? []

describe('container types', () => {
  describe('group', () => {
    const schema = build(
      form({
        name: 'address',
        type: 'group',
        fields: [
          { type: 'heading', text: 'Address' },
          { name: 'city', type: 'text', required: true },
          { name: 'zip', type: 'text', rules: [{ rule: 'digits' }] },
        ],
      }),
    )

    it('nests its fields under its name', () => {
      expect(v.parse(schema, { address: { city: 'Novi Sad', zip: '21000' } })).toEqual({
        address: { city: 'Novi Sad', zip: '21000' },
      })
    })

    it('reports issues at the paths Formisch uses', () => {
      expect(paths(schema, { address: { city: '', zip: 'x' } })).toEqual([
        'address.city',
        'address.zip',
      ])
    })

    it("can't be required", () => {
      expect(issues({ name: 'a', type: 'group', fields: [], required: true })).toEqual([
        { code: 'invalid_shape', path: ['fields', 0, 'required'] },
      ])
    })

    it('allows a name used in another group', () => {
      expect(
        issues(
          { name: 'billing', type: 'group', fields: [{ name: 'city', type: 'text' }] },
          { name: 'shipping', type: 'group', fields: [{ name: 'city', type: 'text' }] },
        ),
      ).toEqual([])
    })
  })

  describe('array', () => {
    it('builds a list of single values with of', () => {
      const schema = build(
        form({
          name: 'tags',
          type: 'array',
          of: { type: 'text', required: true },
          rules: [{ rule: 'minLength', value: 1, message: 'Add a tag' }],
        }),
      )

      expect(messages(schema, { tags: [] })).toEqual(['Add a tag'])
      expect(messages(schema, { tags: ['a'] })).toEqual([])
      expect(paths(schema, { tags: ['a', ''] })).toEqual(['tags.1'])
    })

    it.each([null, false, 0, ''])('reports of: %j as invalid_shape', (of) => {
      expect(issues({ name: 'tags', type: 'array', of })).toEqual([
        { code: 'invalid_shape', path: ['fields', 0, 'of'] },
      ])
    })

    it('ignores the name of the field in of', () => {
      const schema = build(form({ name: 'tags', type: 'array', of: { name: 'tag', type: 'text' } }))

      expect(v.parse(schema, { tags: ['a'] })).toEqual({ tags: ['a'] })
    })

    it('builds a list of objects with fields', () => {
      const schema = build(
        form({
          name: 'lines',
          type: 'array',
          fields: [
            { type: 'divider' },
            { name: 'product', type: 'text', required: true },
            { name: 'quantity', type: 'number', rules: [{ rule: 'minValue', value: 1 }] },
          ],
        }),
      )

      expect(v.parse(schema, { lines: [{ product: 'Tea', quantity: 2 }] })).toEqual({
        lines: [{ product: 'Tea', quantity: 2 }],
      })
      expect(paths(schema, { lines: [{ product: 'Tea' }, { product: '', quantity: 0 }] })).toEqual([
        'lines.1.product',
        'lines.1.quantity',
      ])
    })

    it('requires at least one item when required', () => {
      const schema = build(
        form({ name: 'tags', type: 'array', of: { type: 'text' }, required: true }),
      )

      expect(messages(schema, { tags: [] })).toEqual(['Required'])
      expect(messages(schema, { tags: ['a'] })).toEqual([])
    })

    it.each([
      ['both of and fields', { of: { type: 'text' }, fields: [] }],
      ['neither of nor fields', {}],
    ])('reports %s as invalid_props', (_, props) => {
      expect(issues({ name: 'a', type: 'array', ...props })).toEqual([
        { code: 'invalid_props', path: ['fields', 0] },
      ])
    })
  })

  it('reports an issue at its full path, levels deep', () => {
    expect(
      issues({
        name: 'order',
        type: 'group',
        fields: [
          {
            name: 'lines',
            type: 'array',
            fields: [{ name: 'product', type: 'text', rules: [{ rule: 'nope' }] }],
          },
        ],
      }),
    ).toEqual([
      {
        code: 'unknown_rule',
        path: ['fields', 0, 'fields', 0, 'fields', 0, 'rules', 0, 'rule'],
      },
    ])
  })
})
