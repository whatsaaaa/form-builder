import type {
  FillContext,
  FillResult,
  FillTriggerValue,
  TargetFill,
} from '@whatsaaaa/form-builder-schema'
import type { FillMapValue } from '../definition/fill'

/** What a source gets with the value of the trigger. */
export interface FillSourceContext extends FillContext {
  /** The trigger's dot path, like `'profile'`, for a source that several fields use. */
  readonly trigger: string
  /** The fields the fill sets, by dot path, as its `fields` lists them. */
  readonly fields: readonly string[]
}

/**
 * Gives the values of a fill's fields for a value of its trigger, at once or in a promise, e.g.
 * from a server. Null or undefined give none, so every field of the fill is set blank. What it
 * throws or rejects with goes to the app's error handler, unless the call was aborted by then.
 */
export type FillSource = (
  value: FillTriggerValue,
  context: FillSourceContext,
) => FillResult | PromiseLike<FillResult>

/** The values of a map for a value of its trigger: its entry for the value, or none without one. */
export function mapValues(
  map: Readonly<Record<string, Readonly<Record<string, FillMapValue>>>>,
): TargetFill['values'] {
  return (value) => {
    const key = String(value)
    return Object.hasOwn(map, key) ? map[key] : null
  }
}

/**
 * The values of the source named `name`, given the trigger and the fields the fill sets. Without
 * that source, it throws a TypeError, which the form reports like any error of a fill.
 */
export function sourceValues(
  name: string,
  sources: Readonly<Record<string, FillSource>> | undefined,
  trigger: string,
  fields: readonly string[],
): TargetFill['values'] {
  return (value, context) => {
    const source = sources && Object.hasOwn(sources, name) ? sources[name] : undefined
    if (!source) {
      throw new TypeError(
        `No source "${name}" for the fills of "${trigger}". Give it to fills({ sources })`,
      )
    }
    return source(value, { ...context, trigger, fields })
  }
}
