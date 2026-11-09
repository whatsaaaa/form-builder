import * as v from 'valibot'
import { toLocalDate } from '../shared/local-date'
import { defineFormRule } from './define-form-rule'
import type { FormRuleDef } from './form-rule-def'

type Ordered = number | string

const meta = (label: string, description: string) =>
  ({ label, description, category: 'comparison' }) as const

/**
 * The values to compare. A date field with `output: 'date'` holds a Date by the time form rules
 * run, and one without it holds the ISO string. When either is a Date, both are compared by their
 * time, with the string read the way `output: 'date'` reads it, because `===` compares the objects.
 */
const comparable = (values: readonly unknown[]): unknown[] =>
  values.some((value) => value instanceof Date)
    ? values.map((value) =>
        (value instanceof Date ? value : toLocalDate(value as string)).getTime(),
      )
    : [...values]

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
    check: (values) => {
      const [value, other] = comparable(values)
      return value === other
    },
  }),
  differentFrom: defineFormRule({
    params: otherParams,
    reads: (params) => [params.other],
    kinds: ['string', 'number', 'boolean', 'date'],
    sameKind: true,
    meta: meta('Different from', 'Differs from another field, e.g. a new password'),
    check: (values) => {
      const [value, other] = comparable(values)
      return value !== other
    },
  }),
  compare: defineFormRule({
    params: v.object({ op: v.picklist(['lt', 'lte', 'gt', 'gte']), other: v.string() }),
    reads: (params) => [params.other],
    kinds: ['number', 'date'],
    sameKind: true,
    meta: meta('Compare', 'Less or greater than another field, e.g. an end date after the start'),
    check: (values, { op }) => {
      const [value, other] = comparable(values) as [Ordered, Ordered]
      return operators[op](value, other)
    },
  }),
} satisfies Record<string, FormRuleDef>
