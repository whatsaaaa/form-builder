import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { form, messages } from '../helpers'

describe('metadata', () => {
  const { build } = createSchemaBuilder()

  it('puts the label and description on the field schema', () => {
    const schema = build(
      form(
        { name: 'email', type: 'email', label: 'Email', description: 'For receipts' },
        { name: 'age', type: 'number', label: 'Age', required: true },
      ),
    )
    const { email, age } = schema.entries

    expect(v.getTitle(email!)).toBe('Email')
    expect(v.getDescription(email!)).toBe('For receipts')
    expect(v.getTitle(age!)).toBe('Age')
    expect(v.getDescription(age!)).toBeUndefined()
  })

  it('adds nothing without a label or description', () => {
    const { entries } = build(form({ name: 'nickname', type: 'text' }))

    expect(v.getTitle(entries.nickname!)).toBeUndefined()
    expect(entries.nickname!.type).toBe('optional')
  })

  it('resolves both with resolveMessage', () => {
    const resolved = createSchemaBuilder({
      resolveMessage: (key, ctx) =>
        key.startsWith('form.') ? `${ctx.field.name}: ${key}` : undefined,
    })
    const { entries } = resolved.build(
      form({ name: 'email', type: 'email', label: 'form.email', description: 'Plain text' }),
    )

    expect(v.getTitle(entries.email!)).toBe('email: form.email')
    expect(v.getDescription(entries.email!)).toBe('Plain text')
  })

  it('parses the same way', () => {
    const schema = build(
      form(
        { name: 'email', type: 'email', label: 'Email', required: true },
        { name: 'nickname', type: 'text', label: 'Nickname' },
      ),
    )

    expect(v.parse(schema, { email: 'ana@example.com', nickname: '' })).toEqual({
      email: 'ana@example.com',
      nickname: undefined,
    })
    expect(messages(schema, { email: '' })).toEqual(['Required'])
  })

  it('keeps the object and array schemas of containers inside', () => {
    const schema = build(
      form(
        {
          name: 'address',
          type: 'group',
          label: 'Address',
          fields: [{ name: 'city', type: 'text' }],
        },
        { name: 'tags', type: 'array', label: 'Tags', of: { type: 'text' } },
      ),
    )
    const { address, tags } = schema.entries as Record<
      string,
      v.OptionalSchema<v.GenericSchema, unknown>
    >

    expect(v.getTitle(address!)).toBe('Address')
    expect(v.getTitle(tags!)).toBe('Tags')
    // Formisch unwraps the optional schema and reads the object or array inside.
    expect(address!.type).toBe('optional')
    expect(address!.wrapped.type).toBe('object')
    expect(tags!.wrapped.type).toBe('array')
    expect(v.parse(schema, {})).toEqual({ address: { city: undefined }, tags: [] })
  })
})
