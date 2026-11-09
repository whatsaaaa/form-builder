import { coerceInput, type KindDef, type ValueKind } from '@whatsaaaa/form-builder-schema'
import type { Effect, Operator, Scalar } from '../definition/affect'

/** A condition, checked, with each test reading its field by the index of the read. */
export type Compiled =
  | { readonly all: readonly Compiled[] }
  | { readonly any: readonly Compiled[] }
  | CompiledTest

export interface CompiledTest {
  /** The index of the field it reads, in the reads of the target. */
  readonly read: number
  readonly operator: Operator
  /** The value `equals`, `notEquals` and `includes` compare with, or the values of `in`. */
  readonly value: Scalar | readonly Scalar[] | true
  /** The kinds of the field it reads, to turn its input into its value, e.g. `'5'` into `5`. */
  readonly kind: ValueKind
  readonly itemKind: ValueKind | undefined
  readonly kindDef: KindDef
}

/**
 * Whether a condition is met. `read(i)` gives the input of the field of read `i`, or undefined
 * while it is hidden: a hidden field is empty.
 *
 * An empty field never equals a value, and so is not equal to any: `notEquals` is true for it.
 */
export function test(condition: Compiled, read: (i: number) => unknown): boolean {
  if ('all' in condition) return condition.all.every((each) => test(each, read))
  if ('any' in condition) return condition.any.some((each) => test(each, read))

  const { operator, value, kind, itemKind, kindDef } = condition
  // What the form holds, the way a renderer sets it: '5' is 5 for a number.
  const input = coerceInput(read(condition.read), { kind, itemKind })
  const empty = input === undefined || kindDef.isEmpty(input)
  switch (operator) {
    case 'empty':
      return empty
    case 'notEmpty':
      return !empty
    case 'equals':
      return !empty && input === value
    case 'notEquals':
      return empty || input !== value
    case 'in':
      return !empty && (value as readonly Scalar[]).includes(input as Scalar)
    case 'includes':
      return !empty && Array.isArray(input) && input.includes(value)
  }
}

/**
 * Whether the affects of a target hide it, and clear it: an unmet `show`, a met `hide` or a met
 * `hideAndClear` hides it, so hide always wins, and only a met `hideAndClear` clears it.
 */
export function stateOf(
  effects: Readonly<Partial<Record<Effect, Compiled>>>,
  read: (i: number) => unknown,
): { hidden: boolean; clear: boolean } {
  const shown = effects.show === undefined || test(effects.show, read)
  const hidden = effects.hide !== undefined && test(effects.hide, read)
  const clear = effects.hideAndClear !== undefined && test(effects.hideAndClear, read)
  return { hidden: !shown || hidden || clear, clear }
}
