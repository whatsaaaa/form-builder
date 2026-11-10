import * as v from 'valibot'
import type { FieldPath } from '../render/to-field-path'
import type { AnySchema } from '../shared/valibot-types'
import type { Engine, Evaluation, HiddenField, UnitValue } from './engine'

/**
 * A hidden field's input, in the copy of the form's input that the root gate parses. Its gate
 * reads it, so the field never reports an issue.
 */
class Hidden {
  constructor(
    readonly input: unknown,
    readonly clear: boolean,
  ) {}
}

/** Where the root gate puts what is hidden, on Valibot's config, for the form rules. */
const EVALUATION = Symbol('visibility')

/** What is hidden in the parse that runs, from Valibot's config, if the form has conditions. */
export const evaluationOf = (config: object): Evaluation | undefined =>
  (config as { [EVALUATION]?: Evaluation })[EVALUATION]

type Dataset = v.OutputDataset<unknown, v.BaseIssue<unknown>>

/**
 * Wraps the schema of a field that conditions can hide. It parses as `schema` until the root
 * gate marks the field hidden: then it reports nothing, and outputs what the field submits.
 * Like `unlessEmpty`, it has the type and keys of `schema`, so Formisch still sees the object,
 * array or optional schema inside.
 *
 * - Cleared: blank, `undefined` or `[]` for an array.
 * - Hidden otherwise: the output when `schema` takes the input, else blank.
 * - A group is no unit of its own: the fields inside it are hidden too, and each decides. Its own
 *   rules are skipped.
 */
export function fieldGate(schema: AnySchema, role: UnitValue['role']): AnySchema {
  const gate: AnySchema = {
    ...schema,
    '~run': (dataset, config) => {
      const hidden = dataset.value
      if (!(hidden instanceof Hidden)) return schema['~run'](dataset, config)
      const blank = role === 'array' ? [] : undefined
      if (hidden.clear && role !== 'group') return success(blank)
      const result: Dataset = schema['~run']({ value: hidden.input }, config)
      if (role === 'group') return success(result.value)
      return success(result.issues || !result.typed ? blank : result.value)
    },
  }
  // The pipe gives it the Standard Schema props of its own `~run`.
  return v.pipe(gate)
}

const success = (value: unknown): Dataset => ({ typed: true, value })

/**
 * Wraps the form's schema. On each parse it works out what is hidden from the input, puts a
 * `Hidden` in place of each hidden field's input in a copy of it, and parses that, with what is
 * hidden on the config for the form rules. The form's schema keeps its type and entries.
 */
export function rootGate<TSchema extends AnySchema>(schema: TSchema, engine: Engine): TSchema {
  const gate: AnySchema = {
    ...schema,
    '~run': (dataset, config) => {
      const evaluation = engine.evaluate(dataset.value)
      const value = markHidden(dataset.value, evaluation.hiddenFields)
      // Valibot passes its config on to every schema and action inside, the form rules too.
      const withEvaluation = { ...config, [EVALUATION]: evaluation } as typeof config
      return schema['~run']({ ...dataset, value }, withEvaluation)
    },
  }
  return v.pipe(gate) as unknown as TSchema
}

/**
 * A copy of `input` with a `Hidden` at the path of each hidden field. The deepest come first, so a
 * hidden group or array holds the `Hidden` of each field inside it. Only the objects and arrays on
 * the way are copied. A missing object on the way is added, as the schema's default would be.
 */
function markHidden(input: unknown, fields: readonly HiddenField[]): unknown {
  let marked = input
  for (const field of fields) {
    marked = update(marked, field.path, (value) => new Hidden(value, field.clear))
  }
  return marked
}

/** `input` with the value at `path` replaced by `change(value)`, or as it is when it can't hold one. */
export function update(
  input: unknown,
  path: FieldPath,
  change: (value: unknown) => unknown,
): unknown {
  const [key, ...rest] = path
  if (key === undefined) return change(input)
  const container = input === undefined && typeof key === 'string' ? {} : input
  if (typeof container !== 'object' || container === null || container instanceof Hidden) {
    return input
  }
  const copy = (Array.isArray(container) ? [...container] : { ...container }) as Record<
    string | number,
    unknown
  >
  copy[key] = update(copy[key], rest, change)
  return copy
}
