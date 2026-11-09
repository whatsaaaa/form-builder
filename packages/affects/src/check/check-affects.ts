import type {
  DefinitionPath,
  ExtensionContext,
  ExtensionTarget,
  ResolvedField,
  TargetConditions,
} from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'
import { EFFECTS, type Effect, OPERATORS, type Operator, type Scalar } from '../definition/affect'
import { type Compiled, type CompiledTest, stateOf } from '../evaluate/evaluate'

/** The kinds whose values a test can compare: a value is one string, number or boolean. */
const SCALAR_KINDS: readonly string[] = ['string', 'number', 'boolean', 'date']

/**
 * Checks the `affects` of every field, step and section, and adds their issues. Returns the
 * conditions of each one whose affects have no issues.
 */
export function checkAffects(
  ctx: ExtensionContext,
): ReadonlyMap<ExtensionTarget, TargetConditions> {
  const found = new Map<ExtensionTarget, TargetConditions>()
  for (const target of ctx.targets) {
    if (!Object.hasOwn(target.json, 'affects')) continue
    const conditions = checkTarget(target, ctx)
    if (conditions) found.set(target, conditions)
  }
  return found
}

/** The conditions of one target, or undefined when its affects have issues. */
function checkTarget(target: ExtensionTarget, ctx: ExtensionContext): TargetConditions | undefined {
  const issues = createIssues(ctx)
  const path = [...target.definitionPath, 'affects']
  const raw = target.json['affects']
  if (!Array.isArray(raw)) {
    issues.add('invalid_shape', path, '"affects" is a list of { "effect", "when" }')
    return undefined
  }
  if (isItemField(target)) {
    const message = `The field of a list's items has no "affects" of its own. Put them on the list`
    issues.add('invalid_shape', path, message)
    return undefined
  }

  const reads: TargetConditions['reads'][number][] = []
  const effects: Partial<Record<Effect, Compiled>> = {}
  raw.forEach((affect: unknown, j) => {
    const at = [...path, j]
    if (!isObject(affect)) {
      issues.add('invalid_shape', at, 'An affect is an object with "effect" and "when"')
      return
    }
    issues.unknownKeys(affect, ['effect', 'when'], at, 'an affect')
    const effect = affect['effect']
    if (!EFFECTS.includes(effect as Effect)) {
      issues.add('invalid_shape', [...at, 'effect'], '"effect" is "show", "hide" or "hideAndClear"')
    } else if (Object.hasOwn(effects, effect as Effect)) {
      const message = `"${effect as string}" is in "affects" already. Join its conditions with "all" or "any"`
      issues.add('invalid_shape', at, message)
    }
    if (!Object.hasOwn(affect, 'when')) {
      issues.add('invalid_shape', at, 'An affect needs "when", its condition')
      return
    }
    const compiled = checkCondition(affect['when'], [...at, 'when'], target, ctx, issues, reads)
    if (compiled && EFFECTS.includes(effect as Effect)) effects[effect as Effect] ??= compiled
  })

  if (issues.count) return undefined
  return { reads, evaluate: (read) => stateOf(effects, read) }
}

/**
 * Checks a condition, and compiles it, adding each field it reads to `reads`. Undefined when it
 * has issues.
 */
function checkCondition(
  raw: unknown,
  at: DefinitionPath,
  target: ExtensionTarget,
  ctx: ExtensionContext,
  issues: Issues,
  reads: TargetConditions['reads'][number][],
): Compiled | undefined {
  if (!isObject(raw)) {
    const message = 'A condition is an object: "field" with an operator, "all" or "any"'
    issues.add('invalid_shape', at, message)
    return undefined
  }
  const groups = (['all', 'any'] as const).filter((key) => Object.hasOwn(raw, key))
  const operators = OPERATORS.filter((key) => Object.hasOwn(raw, key))
  const kinds = [...groups, ...(Object.hasOwn(raw, 'field') ? ['field'] : [])]
  if (kinds.length > 1) {
    const keys = kinds.map((key) => `"${key}"`).join(' and ')
    issues.add('invalid_shape', at, `A condition has one of "all", "any" and "field", not ${keys}`)
    return undefined
  }

  const [group] = groups
  if (group) {
    issues.unknownKeys(raw, [group], at, 'a condition')
    const list = raw[group]
    if (!Array.isArray(list) || !list.length) {
      issues.add('invalid_shape', [...at, group], `"${group}" is a list of at least one condition`)
      return undefined
    }
    const compiled = list.map((each: unknown, k) =>
      checkCondition(each, [...at, group, k], target, ctx, issues, reads),
    )
    if (!compiled.every((each) => each !== undefined)) return undefined
    return group === 'all' ? { all: compiled } : { any: compiled }
  }

  const unknown = issues.unknownKeys(raw, ['field', ...OPERATORS], at, 'a condition')
  const field = raw['field']
  if (typeof field !== 'string' || !field) {
    issues.add(
      'invalid_shape',
      [...at, 'field'],
      '"field" is the dot path of a field, like "address.city"',
    )
  }
  const [operator, other] = operators
  if (other) {
    const keys = operators.map((key) => `"${key}"`).join(', ')
    issues.add('invalid_shape', at, `A condition has one operator, not ${keys}`)
  } else if (!operator && !unknown) {
    const message = `A condition needs an operator: ${OPERATORS.map((key) => `"${key}"`).join(', ')}`
    issues.add('invalid_shape', at, message)
  }
  if (typeof field !== 'string' || !field || !operator || other) return undefined
  const value = checkValueShape(operator, raw[operator], [...at, operator], issues)
  if (value === undefined) return undefined

  const resolved = ctx.resolve(field, target)
  if (typeof resolved === 'string') issues.add('unknown_field', [...at, 'field'], resolved)
  if (typeof resolved === 'string' || resolved === null) return undefined
  if (!checkKind(operator, resolved, field, [...at, operator], issues)) return undefined
  if (!checkValues(operator, value, resolved, field, [...at, operator], issues)) return undefined

  reads.push({ field: resolved, at: [...at, 'field'] })
  return {
    read: reads.length - 1,
    operator,
    value,
    kind: resolved.kind,
    itemKind: resolved.item?.kind,
    kindDef: resolved.kindDef,
  } satisfies CompiledTest
}

/** The operator's value when it has the right shape, or undefined with an issue. */
function checkValueShape(
  operator: Operator,
  value: unknown,
  at: DefinitionPath,
  issues: Issues,
): CompiledTest['value'] | undefined {
  switch (operator) {
    case 'empty':
    case 'notEmpty':
      if (value === true) return true
      issues.add(
        'invalid_shape',
        at,
        `"${operator}" is true. For the opposite, use "${operator === 'empty' ? 'notEmpty' : 'empty'}"`,
      )
      return undefined
    case 'in':
      if (Array.isArray(value) && value.length && value.every(isScalar)) return value
      issues.add('invalid_shape', at, '"in" is a list of at least one string, number or boolean')
      return undefined
    default:
      if (isScalar(value)) return value
      issues.add('invalid_shape', at, `"${operator}" is a string, a number or a boolean`)
      return undefined
  }
}

/** True when the operator fits the field's kind. Adds a `kind_mismatch` issue when it doesn't. */
function checkKind(
  operator: Operator,
  field: ResolvedField,
  dotPath: string,
  at: DefinitionPath,
  issues: Issues,
): boolean {
  const { kind, item } = field
  let fits: boolean
  let what = `${kind} fields`
  if (operator === 'empty' || operator === 'notEmpty') {
    // A group is never empty: it always holds its fields.
    fits = kind !== 'object'
  } else if (operator === 'includes') {
    fits = kind === 'array' && !!item && SCALAR_KINDS.includes(item.kind)
    what = kind !== 'array' ? what : `lists of ${item ? `${item.kind} items` : 'objects'}`
  } else {
    fits = SCALAR_KINDS.includes(kind)
  }
  if (!fits)
    issues.add('kind_mismatch', at, `"${operator}" can't be used on ${what}, like "${dotPath}"`)
  return fits
}

/**
 * True when the field can hold each value the operator compares with: its schema, or that of its
 * items for `includes`, takes it, and it isn't empty. Adds an `invalid_value` issue for each it
 * can't.
 */
function checkValues(
  operator: Operator,
  value: CompiledTest['value'],
  field: ResolvedField,
  dotPath: string,
  at: DefinitionPath,
  issues: Issues,
): boolean {
  if (operator === 'empty' || operator === 'notEmpty') return true
  const schema =
    operator === 'includes'
      ? (field.item as NonNullable<ResolvedField['item']>).schema
      : field.schema
  const values = operator === 'in' ? (value as readonly Scalar[]) : [value as Scalar]
  let valid = true
  values.forEach((each, k) => {
    const where = operator === 'in' ? [...at, k] : at
    if (operator !== 'includes' && field.kindDef.isEmpty(each)) {
      const message = `${JSON.stringify(each)} is no value, so it never matches. Use "empty" or "notEmpty"`
      issues.add('invalid_value', where, message)
      valid = false
      return
    }
    const result = v.safeParse(schema, each)
    if (result.success) return
    const reason = result.issues[0].message
    issues.add('invalid_value', where, `"${dotPath}" can't hold ${JSON.stringify(each)}: ${reason}`)
    valid = false
  })
  return valid
}

/** True for the field of a list's items, which has a value and no name: its value is the item. */
function isItemField(target: ExtensionTarget): boolean {
  return (
    target.kind === 'field' &&
    target.field.field.name === undefined &&
    target.field.kind !== 'none' &&
    target.field.dataPath.at(-1) === '*'
  )
}

interface Issues {
  /** How many issues this target has. */
  readonly count: number
  add(code: Parameters<ExtensionContext['issue']>[0], path: DefinitionPath, message: string): void
  /** Adds an issue for each key of `raw` that isn't `known`. True when there are some. */
  unknownKeys(
    raw: Record<string, unknown>,
    known: readonly string[],
    at: DefinitionPath,
    what: string,
  ): boolean
}

function createIssues(ctx: ExtensionContext): Issues {
  let count = 0
  const issues: Issues = {
    get count() {
      return count
    },
    add(code, path, message) {
      count++
      ctx.issue(code, path, message)
    },
    unknownKeys(raw, known, at, what) {
      const unknown = Object.keys(raw).filter((key) => !known.includes(key))
      for (const key of unknown)
        issues.add('unknown_key', [...at, key], `Unknown key "${key}" on ${what}`)
      return unknown.length > 0
    },
  }
  return issues
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isScalar = (value: unknown): value is Scalar =>
  typeof value === 'string' ||
  (typeof value === 'number' && Number.isFinite(value)) ||
  typeof value === 'boolean'
