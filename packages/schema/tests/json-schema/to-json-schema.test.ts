import Ajv from 'ajv'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  defaultFieldTypes,
  defaultFormRules,
  defaultRules,
  defineFieldType,
  defineRule,
  formatRules,
} from '@whatsaaaa/form-builder-schema'
import { toJsonSchema, type JsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'

/** The names a list of fields or rules picks from, by the key it picks with. */
function names(schema: JsonSchema, list: string): unknown {
  const definition = schema.definitions?.[list]
  if (typeof definition !== 'object') return undefined
  const key = list === 'field' || list === 'item' ? 'type' : 'rule'
  const property = definition.properties?.[key]
  return typeof property === 'object' ? property.enum : undefined
}

/** Runs `fn` and returns what it logged with console.warn. */
function warnings(fn: () => void): string[] {
  const { console } = globalThis as unknown as { console: { warn(message: string): void } }
  const original = console.warn
  const logged: string[] = []
  console.warn = (message) => logged.push(message)
  try {
    fn()
  } finally {
    console.warn = original
  }
  return logged
}

const money = defineFieldType({
  kind: 'number',
  props: v.object({ currency: v.picklist(['EUR', 'RSD']), cents: v.optional(v.boolean()) }),
  schema: () => v.number(),
  meta: { label: 'Money', description: 'An amount in one currency' },
})

describe('toJsonSchema', () => {
  const schema = toJsonSchema(createSchemaBuilder())

  it('knows every built-in type, rule and form rule by name', () => {
    expect(names(schema, 'field')).toEqual(Object.keys(defaultFieldTypes))
    expect(names(schema, 'rules')).toEqual(Object.keys(defaultRules))
    expect(names(schema, 'formRule')).toEqual(Object.keys(defaultFormRules))
    // The items of a list need a value, so display elements can't be one.
    expect(names(schema, 'item')).not.toContain('heading')
  })

  it("turns meta into each type's and rule's title and description", () => {
    expect(schema.definitions).toMatchObject({
      'type.email': {
        title: 'Email',
        description: 'An email address, checked by the email rule',
      },
      'rule.regex': { title: 'Matches pattern' },
      formRule: {
        allOf: [
          {
            // oxlint-disable-next-line unicorn/no-thenable -- JSON Schema conditional keyword
            then: { title: 'Same as' },
          },
          {},
          {},
        ],
      },
    })
  })

  it("lists only the rules that fit a type's kind", () => {
    expect(schema.definitions).toMatchObject({
      'type.number': { properties: { rules: { items: { $ref: '#/definitions/rules.number' } } } },
      // A select's kind depends on its options, so every rule fits.
      'type.select': { properties: { rules: { items: { $ref: '#/definitions/rules' } } } },
    })
    expect(names(schema, 'rules.number')).toContain('minValue')
    expect(names(schema, 'rules.number')).not.toContain('minLength')
  })

  it('gives params that depend on the kind one schema per kind', () => {
    expect(schema.definitions).toMatchObject({
      'rule.minValue.number': { properties: { value: { type: 'number' } } },
      'rule.minValue.date': { properties: { value: { type: 'string' } } },
      'rule.maxLength': { required: ['rule', 'value'] },
    })
  })

  it('points child fields at the schema of fields or of list items', () => {
    expect(schema.definitions).toMatchObject({
      'type.group': {
        properties: { fields: { type: 'array', items: { $ref: '#/definitions/field' } } },
      },
      'type.array': { properties: { of: { $ref: '#/definitions/item' } } },
    })
  })

  it("includes your own types' props", () => {
    const own = toJsonSchema(createSchemaBuilder({ fieldTypes: { money } }))

    expect(names(own, 'field')).toContain('money')
    expect(own.definitions?.['type.money']).toMatchObject({
      title: 'Money',
      properties: { currency: { enum: ['EUR', 'RSD'] }, cents: { type: 'boolean' } },
      required: ['currency'],
      additionalProperties: false,
    })
  })

  it('checks definitions with Ajv', () => {
    const check = new Ajv().compile(toJsonSchema(createSchemaBuilder({ fieldTypes: { money } })))
    const form = (field: object) => ({ version: '1', fields: [field] })

    expect(check(form({ name: 'price', type: 'money', currency: 'EUR' }))).toBe(true)
    expect(check(form({ name: 'price', type: 'money', currency: 'USD' }))).toBe(false)
    expect(check(form({ name: 'price', type: 'money' }))).toBe(false)
    expect(check(form({ name: 'a', type: 'text', rules: [{ rule: 'minLength', value: 2 }] }))).toBe(
      true,
    )
    expect(check(form({ name: 'a', type: 'text', rules: [{ rule: 'minValue', value: 2 }] }))).toBe(
      false,
    )
  })

  it('takes any keys, with a warning, where a schema has no JSON Schema form', () => {
    const odd = defineRule({
      kinds: ['string'],
      params: v.object({ at: v.instance(Date) }),
      create: () => v.check(() => true),
    })
    let own: JsonSchema = {}
    const logged = warnings(() => {
      own = toJsonSchema(createSchemaBuilder({ rules: { odd } }))
    })

    expect(logged).toEqual([expect.stringContaining('the params of rule "odd"')])
    expect(own.definitions?.['rule.odd']).toEqual({ type: 'object' })
  })

  it('is still a valid JSON Schema when nothing fits', () => {
    // The email and url types need the format rules. No form rule is left.
    const lean = toJsonSchema(
      createSchemaBuilder({ includeDefaultRules: false, rules: formatRules }),
    )

    expect(lean.definitions?.formRule).toEqual({
      description: 'No form rule is registered',
      not: {},
    })
    expect(() => new Ajv().compile(lean)).not.toThrow()
  })
})
