import * as v from 'valibot'
import { defineRule } from './define-rule'
import { countParams } from './param-schemas'
import type { RuleDef } from './rule-def'

const kinds = ['string', 'array'] as const
const meta = (label: string) => ({ label, category: 'length' }) as const

/** Characters of a string, or items of an array */
export const lengthRules = {
  length: defineRule({
    kinds,
    params: countParams,
    meta: meta('Exact length'),
    create: (p, m) => v.length(p.value, m),
  }),
  minLength: defineRule({
    kinds,
    params: countParams,
    meta: meta('Minimum length'),
    create: (p, m) => v.minLength(p.value, m),
  }),
  maxLength: defineRule({
    kinds,
    params: countParams,
    meta: meta('Maximum length'),
    create: (p, m) => v.maxLength(p.value, m),
  }),
  notLength: defineRule({
    kinds,
    params: countParams,
    meta: meta('Not this length'),
    create: (p, m) => v.notLength(p.value, m),
  }),
} satisfies Record<string, RuleDef>
