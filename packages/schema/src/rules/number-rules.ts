import * as v from 'valibot'
import { defineRule } from './define-rule'
import type { RuleDef } from './rule-def'

const kinds = ['number'] as const
const meta = (label: string) => ({ label, category: 'number' }) as const

const divisor = v.pipe(v.number(), v.finite(), v.notValue(0, "Can't be 0"))

/** Checks only numbers have. */
export const numberRules = {
  integer: defineRule({ kinds, meta: meta('Whole number'), create: (_, m) => v.integer(m) }),
  safeInteger: defineRule({
    kinds,
    meta: meta('Safe whole number'),
    create: (_, m) => v.safeInteger(m),
  }),
  finite: defineRule({ kinds, meta: meta('Finite number'), create: (_, m) => v.finite(m) }),
  multipleOf: defineRule({
    kinds,
    params: v.object({ value: divisor }),
    meta: meta('Multiple of'),
    create: (p, m) => v.multipleOf(p.value, m),
  }),
} satisfies Record<string, RuleDef>
