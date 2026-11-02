import * as v from 'valibot'
import type { AnyAction } from '../shared/valibot-types'
import type { ValueKind } from '../shared/value-kind'
import { defineRule } from './define-rule'
import { valueSchema } from './param-schemas'
import type { RuleDef } from './rule-def'

type Value = string | number | boolean

const ordered = ['number', 'date'] as const
const any = ['number', 'date', 'string', 'boolean'] as const
const meta = (label: string) => ({ label, category: 'comparison' }) as const

// The param has the field's type: a number on a number field, an ISO string on a date field.
const valueParams = (kind: ValueKind) => v.object({ value: valueSchema(kind) })
const valuesParams = (kind: ValueKind) =>
  v.object({
    values: v.pipe(v.array(valueSchema(kind)), v.minLength(1, 'Give at least one value')),
  })

/** Compares the value with a param of the same type. */
export const comparisonRules = {
  minValue: defineRule({
    kinds: ordered,
    params: valueParams,
    meta: meta('Minimum'),
    create: (p, m) => v.minValue(p.value as Value, m) as AnyAction,
  }),
  maxValue: defineRule({
    kinds: ordered,
    params: valueParams,
    meta: meta('Maximum'),
    create: (p, m) => v.maxValue(p.value as Value, m) as AnyAction,
  }),
  gtValue: defineRule({
    kinds: ordered,
    params: valueParams,
    meta: meta('Greater than'),
    create: (p, m) => v.gtValue(p.value as Value, m) as AnyAction,
  }),
  ltValue: defineRule({
    kinds: ordered,
    params: valueParams,
    meta: meta('Less than'),
    create: (p, m) => v.ltValue(p.value as Value, m) as AnyAction,
  }),
  value: defineRule({
    kinds: any,
    params: valueParams,
    meta: meta('Equals'),
    create: (p, m) => v.value(p.value as Value, m) as AnyAction,
  }),
  notValue: defineRule({
    kinds: any,
    params: valueParams,
    meta: meta('Does not equal'),
    create: (p, m) => v.notValue(p.value as Value, m) as AnyAction,
  }),
  values: defineRule({
    kinds: ordered,
    params: valuesParams,
    meta: meta('One of'),
    create: (p, m) => v.values(p.values as Value[], m) as AnyAction,
  }),
  notValues: defineRule({
    kinds: ordered,
    params: valuesParams,
    meta: meta('None of'),
    create: (p, m) => v.notValues(p.values as Value[], m) as AnyAction,
  }),
} satisfies Record<string, RuleDef>
