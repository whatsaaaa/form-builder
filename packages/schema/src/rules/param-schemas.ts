import * as v from 'valibot'
import type { ValueKind } from '../shared/value-kind'

/** A length, count or size: a whole number from 0. */
export const count = v.pipe(v.number(), v.integer(), v.minValue(0))

export const countParams = v.object({ value: count })

const isIsoValue = (input: string) =>
  v.ISO_DATE_REGEX.test(input) || v.ISO_DATE_TIME_REGEX.test(input) || v.ISO_TIME_REGEX.test(input)

/** Valibot compares dates as ISO strings, so the param must be one too. */
export const isoValue = v.pipe(
  v.string(),
  v.check(isIsoValue, 'Use an ISO date, date-time or time, such as 2026-01-01'),
)

export const valueSchema = (kind: ValueKind) => {
  switch (kind) {
    case 'date':
      return isoValue
    case 'string':
      return v.string()
    case 'boolean':
      return v.boolean()
    default:
      return v.number()
  }
}
