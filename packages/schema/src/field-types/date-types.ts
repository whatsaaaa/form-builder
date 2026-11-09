import * as v from 'valibot'
import { toLocalDate } from '../shared/local-date'
import { defineFieldType } from './define-field-type'
import type { FieldTypeDef } from './field-type-def'

const outputProps = v.object({
  /**
   * `'date'` turns the ISO string into a `Date` in local time: a date at midnight. Defaults to
   * `'string'`.
   */
  output: v.optional(v.picklist(['string', 'date'])),
})

// Runs after every rule, so comparison rules like minValue still compare ISO strings.
const finalize = (field: v.InferOutput<typeof outputProps>) =>
  field.output === 'date' ? v.transform(toLocalDate) : undefined

/**
 * Dates and times are ISO strings, the values of <input type="date|time|datetime-local">.
 * The format is part of the type rather than a default rule, so these types don't depend on
 * `dateRules` being registered.
 */
export const dateTypes = {
  date: defineFieldType({
    kind: 'date',
    props: outputProps,
    schema: () => v.pipe(v.string(), v.isoDate()),
    finalize,
    meta: { label: 'Date', description: 'An ISO date, such as 2026-10-28' },
  }),
  time: {
    kind: 'date',
    schema: () => v.pipe(v.string(), v.isoTime()),
    meta: { label: 'Time', description: 'An ISO time, such as 14:30' },
  },
  // A local date and time without a time zone, e.g. 2026-10-28T14:30.
  datetime: defineFieldType({
    kind: 'date',
    props: outputProps,
    schema: () => v.pipe(v.string(), v.isoDateTime()),
    finalize,
    meta: {
      label: 'Date and time',
      description: 'A local ISO date and time, such as 2026-10-28T14:30',
    },
  }),
} satisfies Record<string, FieldTypeDef>
