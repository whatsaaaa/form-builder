import * as v from 'valibot'
import { defineRule } from './define-rule'
import type { RuleDef } from './rule-def'

const stage = 'normalize'
const meta = (label: string, description?: string) =>
  ({ label, description, category: 'normalize' }) as const
const limit = v.object({ value: v.number() })

/**
 * Rules that change the value instead of checking it. They run before the required check, so
 * `'   '` with `trim` is empty. Their `message` is never shown.
 */
export const normalizeRules = {
  trim: defineRule({ kinds: ['string'], stage, meta: meta('Trim'), create: () => v.trim() }),
  trimStart: defineRule({
    kinds: ['string'],
    stage,
    meta: meta('Trim start'),
    create: () => v.trimStart(),
  }),
  trimEnd: defineRule({
    kinds: ['string'],
    stage,
    meta: meta('Trim end'),
    create: () => v.trimEnd(),
  }),
  toLowerCase: defineRule({
    kinds: ['string'],
    stage,
    meta: meta('Lowercase'),
    create: () => v.toLowerCase(),
  }),
  toUpperCase: defineRule({
    kinds: ['string'],
    stage,
    meta: meta('Uppercase'),
    create: () => v.toUpperCase(),
  }),
  normalize: defineRule({
    kinds: ['string'],
    stage,
    params: v.object({ form: v.optional(v.picklist(['NFC', 'NFD', 'NFKC', 'NFKD'])) }),
    meta: meta('Unicode normalize', 'Defaults to NFC.'),
    create: (p) => v.normalize(p.form),
  }),
  toMinValue: defineRule({
    kinds: ['number'],
    stage,
    params: limit,
    meta: meta('Raise to minimum', 'Replaces a smaller number with the minimum.'),
    create: (p) => v.toMinValue(p.value),
  }),
  toMaxValue: defineRule({
    kinds: ['number'],
    stage,
    params: limit,
    meta: meta('Lower to maximum', 'Replaces a larger number with the maximum.'),
    create: (p) => v.toMaxValue(p.value),
  }),
} satisfies Record<string, RuleDef>
