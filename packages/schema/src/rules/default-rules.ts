import * as v from 'valibot'
import { defineRule } from './define-rule'
import type { RuleDef } from './rule-def'

const nonNegInt = v.pipe(v.number(), v.integer(), v.minValue(0))

export const defaultRules = {
  trim: defineRule({ kinds: ['string'], stage: 'normalize', create: () => v.trim() }),
  minLength: defineRule({
    kinds: ['string'],
    params: v.object({ value: nonNegInt }),
    create: (p, m) => v.minLength(p.value, m),
  }),
  maxLength: defineRule({
    kinds: ['string'],
    params: v.object({ value: nonNegInt }),
    create: (p, m) => v.maxLength(p.value, m)
  }),
  regex: defineRule({
    kinds: ['string'],
    params: v.object({ pattern: v.string(), flags: v.optional(v.string()) }),
    create: (p, m) => v.regex(new RegExp(p.pattern, p.flags), m)
  }),
  email: defineRule({ kinds: ['string'], create: (_, m) => v.email(m) }),
  url: defineRule({ kinds: ['string'], create: (_, m) => v.url(m) }),
  minValue: defineRule({
    kinds: ['number'],
    params: v.object({ value: v.number() }),
    create: (p, m) => v.minValue(p.value, m)
  }),
  maxValue: defineRule({
    kinds: ['number'],
    params: v.object({ value: v.number() }),
    create: (p, m) => v.maxValue(p.value, m)
  }),
  integer: defineRule({ kinds: ['number'], create: (_, m) => v.integer(m) }),
} satisfies Record<string, RuleDef>
