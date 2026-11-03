import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  defaultFormRules,
  defineFormRule,
  defineRule,
  fileRules,
  formatRules,
  lengthRules,
  normalizeRules,
  type ValueKind,
} from '@whatsaaaa/form-builder-schema'
import { form, messages } from '../helpers'

describe('rule registry', () => {
  it('calls a params function once per kind', () => {
    const kinds: ValueKind[] = []
    const atLeast = defineRule({
      kinds: ['number', 'date'],
      params: (kind) => {
        kinds.push(kind)
        return v.object({ value: kind === 'date' ? v.string() : v.number() })
      },
      create: (p, m) => v.minValue(p.value, m),
    })
    const { build, validate } = createSchemaBuilder({
      fieldTypes: { day: { kind: 'date', schema: () => v.string() } },
      rules: { atLeast },
    })

    const json = form(
      { name: 'a', type: 'number', rules: [{ rule: 'atLeast', value: 1 }] },
      { name: 'b', type: 'number', rules: [{ rule: 'atLeast', value: 2 }] },
      { name: 'c', type: 'day', rules: [{ rule: 'atLeast', value: '2026-01-01' }] },
    )
    validate(json)
    build(json)

    expect(kinds.sort()).toEqual(['date', 'number'])
  })

  it('throws for a reserved key in params of any kind', () => {
    const bad = defineRule({
      kinds: ['string', 'number'],
      params: (kind) =>
        kind === 'number' ? v.object({ message: v.string() }) : v.object({ value: v.string() }),
      create: () => v.trim(),
    })

    expect(() => createSchemaBuilder({ rules: { bad } })).toThrow(TypeError)
  })

  it('lists the rules that fit a kind', () => {
    const { rulesForKind } = createSchemaBuilder()

    expect(rulesForKind('file').map(([name]) => name)).toEqual(Object.keys(fileRules))
    expect(rulesForKind('string').map(([name]) => name)).toContain('minLength')
    expect(rulesForKind('array').map(([name]) => name)).toEqual([
      'length',
      'minLength',
      'maxLength',
      'notLength',
      'includes',
      'excludes',
    ])
  })

  it('registers only the given rules without the defaults', () => {
    const { validate, rules } = createSchemaBuilder({
      includeDefaultRules: false,
      rules: formatRules,
    })

    expect(Object.keys(rules)).toEqual(Object.keys(formatRules))
    expect(
      validate(form({ name: 'a', type: 'text', rules: [{ rule: 'minLength', value: 1 }] })).issues,
    ).toMatchObject([{ code: 'unknown_rule' }])
  })

  it("throws when a type's default rule is left out", () => {
    // The built-in email type needs the email rule.
    expect(() => createSchemaBuilder({ includeDefaultRules: false, rules: lengthRules })).toThrow(
      TypeError,
    )
  })

  it('runs toLowerCase before the required check and the other rules', () => {
    expect(normalizeRules.toLowerCase.stage).toBe('normalize')

    const { build } = createSchemaBuilder()
    const schema = build(
      form({
        name: 'code',
        type: 'text',
        required: true,
        rules: [{ rule: 'startsWith', value: 'ab' }, { rule: 'toLowerCase' }],
      }),
    )

    expect(v.parse(schema, { code: 'ABC' })).toEqual({ code: 'abc' })
    expect(messages(schema, { code: '' })).toEqual(['Required'])
  })

  it('registers the built-in form rules and merges your own over them', () => {
    const before = defineFormRule({ reads: () => [], check: () => true })
    const sameAs = defineFormRule({ reads: () => [], check: () => false })

    const { formRules } = createSchemaBuilder({ formRules: { before, sameAs } })

    expect(Object.keys(formRules)).toEqual([...Object.keys(defaultFormRules), 'before'])
    expect(formRules.sameAs).toBe(sameAs)
  })

  it('registers only your own form rules without the defaults', () => {
    const before = defineFormRule({ reads: () => [], check: () => true })

    // The built-in email and url types need formatRules.
    const { formRules } = createSchemaBuilder({
      includeDefaultRules: false,
      rules: formatRules,
      formRules: { before },
    })

    expect(Object.keys(formRules)).toEqual(['before'])
  })

  it.each(['rule', 'field', 'message'])(
    'throws for the reserved key %s in form rule params',
    (key) => {
      const bad = defineFormRule({
        params: v.object({ [key]: v.string() }),
        reads: () => [],
        check: () => true,
      })

      expect(() => createSchemaBuilder({ formRules: { bad } })).toThrow(TypeError)
    },
  )
})
