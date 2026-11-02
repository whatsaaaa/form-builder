import * as v from 'valibot'
import type { ValueKind } from '../shared/value-kind'
import { defineRule } from './define-rule'
import type { AnyAction } from '../shared/valibot-types'
import type { RuleDef } from './rule-def'

const meta = (label: string, description?: string) =>
  ({ label, description, category: 'content' }) as const

const regexError = (pattern: string, flags = '') => {
  try {
    new RegExp(pattern, flags)
    return undefined
  } catch (error) {
    return (error as Error).message
  }
}

const FLAGS = /^[dgimsuvy]*$/

const regexParams = v.pipe(
  v.object({
    pattern: v.string(),
    flags: v.optional(v.pipe(v.string(), v.regex(FLAGS, 'Flags can be d, g, i, m, s, u, v and y'))),
  }),
  v.forward(
    v.check(
      (p) => !FLAGS.test(p.flags ?? '') || regexError(p.pattern, p.flags) === undefined,
      (issue) => regexError(issue.input.pattern, issue.input.flags) ?? 'Invalid pattern',
    ),
    ['pattern'],
  ),
)

const item = v.union([v.string(), v.number(), v.boolean()])
const stringParams = v.object({ value: v.string() })
const contentParams = (kind: ValueKind) => v.object({ value: kind === 'array' ? item : v.string() })

export const contentRules = {
  regex: defineRule({
    kinds: ['string'],
    params: regexParams,
    meta: meta('Matches pattern', 'A JavaScript regular expression, without the slashes.'),
    create: (p, m) => v.regex(new RegExp(p.pattern, p.flags?.replace(/[gy]/g, '')), m),
  }),
  startsWith: defineRule({
    kinds: ['string'],
    params: stringParams,
    meta: meta('Starts with'),
    create: (p, m) => v.startsWith(p.value, m),
  }),
  endsWith: defineRule({
    kinds: ['string'],
    params: stringParams,
    meta: meta('Ends with'),
    create: (p, m) => v.endsWith(p.value, m),
  }),
  includes: defineRule({
    kinds: ['string', 'array'],
    params: contentParams,
    meta: meta('Contains'),
    create: (p, m) => v.includes(p.value, m) as AnyAction,
  }),
  excludes: defineRule({
    kinds: ['string', 'array'],
    params: contentParams,
    meta: meta('Does not contain'),
    create: (p, m) => v.excludes(p.value, m) as AnyAction,
  }),
} satisfies Record<string, RuleDef>
