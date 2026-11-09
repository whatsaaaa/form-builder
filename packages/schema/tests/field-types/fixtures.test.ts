import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  defaultFieldTypes,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { type Fixture, fixtures, formRuleFixtures } from '../fixtures'

const { build, validate } = createSchemaBuilder()

describe('fixtures', () => {
  it('has one fixture per built-in type', () => {
    expect(Object.keys(fixtures)).toEqual(Object.keys(defaultFieldTypes))
  })

  it.each(Object.entries(fixtures))(
    '%s is valid and uses its type',
    (type: string, json: Fixture) => {
      expect(validate(json).issues).toEqual([])
      expect(() => build(json as JsonForm)).not.toThrow()
      expect(json.fields.map((field) => field.type)).toContain(type)
    },
  )

  it.each(Object.entries(formRuleFixtures))('%s with form rules is valid', (_, json: Fixture) => {
    expect(validate(json).issues).toEqual([])
  })
})
