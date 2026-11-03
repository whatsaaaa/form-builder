import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { defaultFormRules, type FormRuleDef } from '@whatsaaaa/form-builder-schema'

interface Case {
  rule: keyof typeof defaultFormRules
  params: Record<string, unknown>
  /** Values for `field`, then for the paths it reads. */
  pass: unknown[]
  fail: unknown[]
}

const cases: Case[] = [
  { rule: 'sameAs', params: { other: 'a' }, pass: ['x', 'x'], fail: ['x', 'y'] },
  { rule: 'sameAs', params: { other: 'a' }, pass: [1, 1], fail: [1, 2] },
  {
    rule: 'sameAs',
    params: { other: 'a' },
    pass: [new Date(2026, 0, 1), new Date(2026, 0, 1)],
    fail: [new Date(2026, 0, 1), new Date(2026, 0, 2)],
  },
  { rule: 'differentFrom', params: { other: 'a' }, pass: ['x', 'y'], fail: ['x', 'x'] },
  {
    rule: 'differentFrom',
    params: { other: 'a' },
    pass: [new Date(2026, 0, 1), new Date(2026, 0, 2)],
    fail: [new Date(2026, 0, 1), new Date(2026, 0, 1)],
  },
  { rule: 'compare', params: { op: 'lt', other: 'a' }, pass: [1, 2], fail: [2, 2] },
  { rule: 'compare', params: { op: 'lte', other: 'a' }, pass: [2, 2], fail: [3, 2] },
  { rule: 'compare', params: { op: 'gt', other: 'a' }, pass: [3, 2], fail: [2, 2] },
  { rule: 'compare', params: { op: 'gte', other: 'a' }, pass: [2, 2], fail: [1, 2] },
  {
    rule: 'compare',
    params: { op: 'gt', other: 'a' },
    pass: ['2026-02-01', '2026-01-31'],
    fail: ['2026-01-01', '2026-01-31'],
  },
  {
    rule: 'compare',
    params: { op: 'gt', other: 'a' },
    pass: [new Date(2026, 1, 1), new Date(2026, 0, 31)],
    fail: [new Date(2026, 0, 1), new Date(2026, 0, 31)],
  },
]

const parse = (def: FormRuleDef, params: unknown) => v.parse(def.params ?? v.object({}), params)

describe('built-in form rules', () => {
  it.each(cases)('$rule $params passes $pass and fails $fail', ({ rule, params, pass, fail }) => {
    const def: FormRuleDef = defaultFormRules[rule]
    const parsed = parse(def, params)

    expect(def.check(pass, parsed)).toBe(true)
    expect(def.check(fail, parsed)).toBe(false)
  })

  it.each(Object.entries(defaultFormRules))('%s reads its other field', (_, def: FormRuleDef) => {
    expect(def.reads(parse(def, { op: 'lt', other: 'start' }))).toEqual(['start'])
  })

  it('rejects an unknown operator', () => {
    expect(() => parse(defaultFormRules.compare, { op: 'eq', other: 'a' })).toThrow()
  })

  it.each(Object.entries(defaultFormRules))('%s has meta', (_, def) => {
    expect(def.meta).toMatchObject({ label: expect.any(String), category: 'comparison' })
  })
})
