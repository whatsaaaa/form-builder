import * as v from 'valibot'
import type { KindDef } from './kind-def'

const isNil = (input: unknown) => input === undefined || input === null

// A cleared text input holds ''. Dates and times are ISO strings, so they are empty the same way.
const isBlank = (input: unknown) => isNil(input) || input === ''

export const defaultKinds = {
  string: {
    isEmpty: isBlank,
    required: (message) => v.nonEmpty(message),
  },
  // A cleared <input type="number"/> holds '' or NaN, depending on the adapter.
  number: {
    isEmpty: (input) => isBlank(input) || Number.isNaN(input),
  },
  // Required means "must be ticked", e.g. accepting terms.
  boolean: {
    isEmpty: isNil,
    required: (message) => v.value(true, message),
  },
  date: {
    isEmpty: isBlank,
    required: (message) => v.nonEmpty(message),
  },
  array: {
    isEmpty: (input) => isNil(input) || (Array.isArray(input) && input.length === 0),
    required: (message) => v.minLength(1, message),
  },
  file: { isEmpty: isNil },
  object: { isEmpty: isNil },
  // Display elements (headings, dividers) have no value, so the builder never calls this.
  none: { isEmpty: () => true },
} satisfies Record<string, KindDef>
