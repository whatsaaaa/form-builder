import { describe, expect, it } from 'vitest'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { form } from '../helpers'

const { validate } = createSchemaBuilder()

const issues = (...fields: Parameters<typeof form>) =>
  validate(form(...fields)).issues.map(({ code, path }) => ({ code, path }))

describe('names', () => {
  it.each(['a.b', 'lines[0]', 'a]'])('reports %j as invalid_name', (name) => {
    expect(issues({ name, type: 'text' })).toEqual([
      { code: 'invalid_name', path: ['fields', 0, 'name'] },
    ])
  })

  it('checks duplicates per level', () => {
    expect(
      issues(
        { name: 'city', type: 'text' },
        {
          name: 'address',
          type: 'group',
          fields: [
            { name: 'city', type: 'text' },
            { name: 'city', type: 'text' },
          ],
        },
      ),
    ).toEqual([{ code: 'duplicate_name', path: ['fields', 1, 'fields', 1, 'name'] }])
  })
})

describe('defaults', () => {
  it('reports a default that fails the rules as invalid_default', () => {
    const { issues } = validate(
      form({
        name: 'code',
        type: 'text',
        default: 'abc',
        rules: [{ rule: 'minLength', value: 5, message: 'At least 5 characters' }],
      }),
    )

    expect(issues).toEqual([
      {
        code: 'invalid_default',
        path: ['fields', 0, 'default'],
        message: 'At least 5 characters',
      },
    ])
  })

  it('accepts a default the field accepts', () => {
    expect(
      issues(
        { name: 'code', type: 'text', default: 'abcde', rules: [{ rule: 'minLength', value: 5 }] },
        { name: 'seats', type: 'number', default: 2 },
        { name: 'size', type: 'select', default: 'm', options: [{ value: 'm', label: 'M' }] },
      ),
    ).toEqual([])
  })

  it('reads an empty default as no default', () => {
    expect(issues({ name: 'a', type: 'text', required: true, default: '' })).toEqual([])
  })

  it('reports a default of the wrong type', () => {
    expect(
      issues(
        { name: 'seats', type: 'number', default: '2' },
        { name: 'size', type: 'select', default: 'xl', options: [{ value: 'm', label: 'M' }] },
      ),
    ).toEqual([
      { code: 'invalid_default', path: ['fields', 0, 'default'] },
      { code: 'invalid_default', path: ['fields', 1, 'default'] },
    ])
  })

  describe('on an array', () => {
    it('must be an array', () => {
      expect(issues({ name: 'tags', type: 'array', of: { type: 'text' }, default: 'a' })).toEqual([
        { code: 'invalid_default', path: ['fields', 0, 'default'] },
      ])
    })

    it('reports an item that fails at its index', () => {
      expect(
        issues(
          { name: 'tags', type: 'array', of: { type: 'text' }, default: ['a', 1] },
          {
            name: 'lines',
            type: 'array',
            fields: [{ name: 'product', type: 'text', required: true }],
            default: [{ product: 'Tea' }, { product: '' }],
          },
        ),
      ).toEqual([
        { code: 'invalid_default', path: ['fields', 0, 'default', 1] },
        { code: 'invalid_default', path: ['fields', 1, 'default', 1, 'product'] },
      ])
    })

    it('checks the default of the item field too', () => {
      expect(issues({ name: 'tags', type: 'array', of: { type: 'number', default: 'x' } })).toEqual(
        [{ code: 'invalid_default', path: ['fields', 0, 'of', 'default'] }],
      )
    })
  })
})
