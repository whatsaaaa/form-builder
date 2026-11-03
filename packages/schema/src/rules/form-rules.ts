import * as v from 'valibot'
import { defineFormRule } from './define-form-rule'
import type { FormRuleDef } from './form-rule-def'

type Ordered = number | string

const meta = (label: string, description: string) =>
  ({ label, description, category: 'comparison' }) as const

// A date field with `output: 'date'` holds a Date by the time form rules run. Two Dates are
// compared by their time, because `===` compares the objects.
const comparable = (value: unknown) => (value instanceof Date ? value.getTime() : value)

const otherParams = v.object({ other: v.string() })

const operators = {
  lt: (a: Ordered, b: Ordered) => a < b,
  lte: (a: Ordered, b: Ordered) => a <= b,
  gt: (a: Ordered, b: Ordered) => a > b,
  gte: (a: Ordered, b: Ordered) => a >= b,
}

/** Every built-in form rule. */
export const defaultFormRules = {
  sameAs: defineFormRule({
    params: otherParams,
    reads: (params) => [params.other],
    kinds: ['string', 'number', 'boolean', 'date'],
    sameKind: true,
    meta: meta('Same as', 'Equals another field, e.g. to confirm a password'),
    check: ([value, other]) => comparable(value) === comparable(other),
  }),
  differentFrom: defineFormRule({
    params: otherParams,
    reads: (params) => [params.other],
    kinds: ['string', 'number', 'boolean', 'date'],
    sameKind: true,
    meta: meta('Different from', 'Differs from another field, e.g. a new password'),
    check: ([value, other]) => comparable(value) !== comparable(other),
  }),
  compare: defineFormRule({
    params: v.object({ op: v.picklist(['lt', 'lte', 'gt', 'gte']), other: v.string() }),
    reads: (params) => [params.other],
    kinds: ['number', 'date'],
    sameKind: true,
    meta: meta('Compare', 'Less or greater than another field, e.g. an end date after the start'),
    check: ([value, other], { op }) =>
      operators[op](comparable(value) as Ordered, comparable(other) as Ordered),
  }),
} satisfies Record<string, FormRuleDef>
