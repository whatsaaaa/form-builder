import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import definitionSchema from '@whatsaaaa/form-builder-schema/definition.schema.json'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'
import { type Fixture, fixtures } from '../fixtures'

const form = (...fields: object[]) => ({ version: '1', fields })

describe('definition.schema.json', () => {
  const check = new Ajv({ allErrors: true }).compile(definitionSchema)

  it('is the schema of the default registry', () => {
    // When this fails, run `pnpm docs:gen` and commit what it writes.
    expect(definitionSchema).toEqual(toJsonSchema(createSchemaBuilder()))
  })

  it.each(Object.entries(fixtures))('accepts the %s fixture', (_, fixture: Fixture) => {
    check(fixture)
    expect(check.errors ?? []).toEqual([])
  })

  it('accepts a definition that points at it with $schema', () => {
    const json = { $schema: '../definition.schema.json', ...form({ name: 'a', type: 'text' }) }
    expect(check(json)).toBe(true)
  })

  it.each([
    ['an unknown type', form({ name: 'a', type: 'emial' })],
    ['an unknown rule', form({ name: 'a', type: 'text', rules: [{ rule: 'maxLenght' }] })],
    [
      'a param of the wrong type',
      form({ name: 'a', type: 'text', rules: [{ rule: 'maxLength', value: '3' }] }),
    ],
    [
      'a rule for another kind',
      form({ name: 'a', type: 'number', rules: [{ rule: 'minLength', value: 3 }] }),
    ],
    ['an unknown key', form({ name: 'a', type: 'text', requird: true })],
    ['a missing prop', form({ name: 'a', type: 'radio' })],
    ['a value field without a name', form({ type: 'text' })],
    ['a name with a dot', form({ name: 'a.b', type: 'text' })],
    ['the name *', form({ name: '*', type: 'text' })],
    ['the name __proto__', form({ name: '__proto__', type: 'text' })],
    ['a default on a heading', form({ type: 'heading', text: 'Hi', default: 'x' })],
    ['a required group', form({ name: 'a', type: 'group', required: true, fields: [] })],
    ['rules on a heading', form({ type: 'heading', text: 'Hi', rules: [] })],
    [
      'a heading as list item',
      form({ name: 'a', type: 'array', of: { type: 'heading', text: 'Hi' } }),
    ],
    [
      'a form rule without a message',
      { ...form(), formRules: [{ rule: 'sameAs', field: 'a', other: 'b' }] },
    ],
    ['another version', { version: '2', fields: [] }],
  ])('rejects %s', (_, json) => {
    expect(check(json)).toBe(false)
  })
})
