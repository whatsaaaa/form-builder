import type {
  DefinitionPath,
  ExtensionContext,
  ExtensionTarget,
  FieldTarget,
  ResolvedField,
  TargetConditions,
  TargetFill,
} from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'
import {
  FILL_KEYS,
  FILL_OVERWRITES,
  type FillMapValue,
  type FillOverwrite,
} from '../definition/fill'
import { type FillSource, mapValues, sourceValues } from '../values/values'

/** The kinds a fill can be keyed on: those of one value, that a key of a map can name. */
const TRIGGER_KINDS: readonly string[] = ['string', 'number', 'boolean', 'date']

/** A fill whose shape has no issues. */
type Shaped =
  | {
      readonly source: string
      readonly fields: readonly string[]
      readonly overwrite: FillOverwrite
    }
  | {
      readonly map: Readonly<Record<string, Readonly<Record<string, FillMapValue>>>>
      readonly overwrite: FillOverwrite
    }

/** One place a fill names a field: in `fields`, or in an entry of `map`. */
interface Named {
  readonly path: string
  readonly at: DefinitionPath
  /** For a map: the value the entry gives the field. */
  readonly value?: FillMapValue
}

/**
 * Checks the `fills` of every field, and adds their issues. Adds each fill without issues with
 * `ctx.fill()`, its source from `sources`. Without `sources`, a source's name isn't checked.
 */
export function checkFills(
  sources: Readonly<Record<string, FillSource>> | undefined,
): (ctx: ExtensionContext) => ReadonlyMap<ExtensionTarget, TargetConditions> {
  return (ctx) => {
    for (const target of ctx.targets) {
      // Only fields and display elements take `fills`: the builder reports it on any other target.
      if (target.kind !== 'field' && target.kind !== 'display') continue
      if (!Object.hasOwn(target.json, 'fills')) continue
      const fill = checkTarget(target, ctx, sources)
      if (fill) ctx.fill(target as FieldTarget, fill)
    }
    return new Map()
  }
}

/** The fill of one target, or undefined when it has issues. */
function checkTarget(
  target: ExtensionTarget,
  ctx: ExtensionContext,
  sources: Readonly<Record<string, FillSource>> | undefined,
): TargetFill | undefined {
  const issues = createIssues(ctx)
  const path = [...target.definitionPath, 'fills']
  const fill = checkShape(target.json['fills'], path, issues)
  if (!fill) return undefined
  if ('source' in fill && sources && !Object.hasOwn(sources, fill.source)) {
    issues.add('unknown_source', [...path, 'source'], unknownSource(fill.source, sources))
  }

  const trigger = checkTrigger(target, path, ctx, issues)
  // A fill on a field that can't have one says nothing of its fields.
  if (trigger === undefined) return undefined
  const named: Named[] =
    'source' in fill
      ? fill.fields.map((each, i) => ({ path: each, at: [...path, 'fields', i] }))
      : Object.entries(fill.map).flatMap(([key, entry]) =>
          Object.entries(entry).map(([each, value]) => ({
            path: each,
            at: [...path, 'map', key, each],
            value,
          })),
        )
  const fields = checkFields(named, target, ctx, issues)
  if ('map' in fill && trigger) checkKeys(fill.map, trigger, [...path, 'map'], issues)
  if (trigger === null || !fields || issues.count) return undefined

  const dotPath = (target as FieldTarget).field.dataPath.join('.')
  return {
    fields,
    overwrite: fill.overwrite,
    static: 'map' in fill,
    values:
      'map' in fill
        ? mapValues(fill.map)
        : sourceValues(fill.source, sources, dotPath, fill.fields),
  }
}

/** The fill when it has the right shape, or undefined with its issues. */
function checkShape(raw: unknown, path: DefinitionPath, issues: Issues): Shaped | undefined {
  if (!isObject(raw)) {
    issues.add('invalid_shape', path, '"fills" is an object: { "source", "fields" } or { "map" }')
    return undefined
  }
  const unknown = issues.unknownKeys(raw, FILL_KEYS, path, 'fills')
  const hasSource = Object.hasOwn(raw, 'source')
  const hasMap = Object.hasOwn(raw, 'map')
  const hasFields = Object.hasOwn(raw, 'fields')
  if (hasSource && hasMap) {
    issues.add('invalid_shape', path, 'A fill has "source" or "map", not both')
  } else if (!hasSource && !hasMap && !unknown) {
    const message = `A fill needs "source", a source's name, or "map", the values for each value`
    issues.add('invalid_shape', path, message)
  }

  if (hasSource) {
    const source = raw['source']
    if (typeof source !== 'string' || !source) {
      issues.add(
        'invalid_shape',
        [...path, 'source'],
        '"source" is the name of a source, like "profiles"',
      )
    }
    if (!hasFields) {
      issues.add(
        'invalid_shape',
        path,
        'A fill with "source" needs "fields": the fields it can set',
      )
    }
  }
  if (hasFields) {
    if (hasMap) {
      const message = 'A fill with "map" sets the fields its values name, so it has no "fields"'
      issues.add('invalid_shape', [...path, 'fields'], message)
    } else {
      checkFieldList(raw['fields'], [...path, 'fields'], issues)
    }
  }
  if (hasMap) checkMap(raw['map'], [...path, 'map'], issues)
  if (Object.hasOwn(raw, 'overwrite') && !FILL_OVERWRITES.includes(raw['overwrite'] as never)) {
    issues.add('invalid_shape', [...path, 'overwrite'], '"overwrite" is "unedited" or "always"')
  }

  if (issues.count || (!hasSource && !hasMap)) return undefined
  const overwrite = (raw['overwrite'] as FillOverwrite | undefined) ?? 'unedited'
  return hasSource
    ? { source: raw['source'] as string, fields: raw['fields'] as string[], overwrite }
    : { map: raw['map'] as Extract<Shaped, { map: unknown }>['map'], overwrite }
}

function unknownSource(source: string, sources: Readonly<Record<string, FillSource>>): string {
  const names = Object.keys(sources).map((name) => `"${name}"`)
  const known = names.length
    ? `The sources are ${names.join(', ')}`
    : 'fills() was given no sources'
  return `Unknown source "${source}". ${known}`
}

function checkFieldList(raw: unknown, path: DefinitionPath, issues: Issues): void {
  if (!Array.isArray(raw) || !raw.length) {
    const message = '"fields" is a list of at least one dot path, like "address.city"'
    issues.add('invalid_shape', path, message)
    return
  }
  const seen = new Set<string>()
  raw.forEach((each: unknown, i) => {
    if (typeof each !== 'string' || !each) {
      issues.add('invalid_shape', [...path, i], 'A field is its dot path, like "address.city"')
    } else if (seen.has(each)) {
      issues.add('invalid_shape', [...path, i], `"${each}" is in "fields" already`)
    }
    if (typeof each === 'string') seen.add(each)
  })
}

function checkMap(raw: unknown, path: DefinitionPath, issues: Issues): void {
  if (!isObject(raw) || !Object.keys(raw).length) {
    const message = `"map" has the values for each value of the field, like { "a": { "firstName": "Marko" } }`
    issues.add('invalid_shape', path, message)
    return
  }
  for (const [key, entry] of Object.entries(raw)) {
    if (!isObject(entry)) {
      const message = `The values for "${key}" are an object, by the dot path of each field`
      issues.add('invalid_shape', [...path, key], message)
      continue
    }
    for (const [field, value] of Object.entries(entry)) {
      if (isMapValue(value)) continue
      const message = 'A value is a string, a number, a boolean, null, or a list of the first three'
      issues.add('invalid_shape', [...path, key, field], message)
    }
  }
}

/**
 * The trigger, the field the fill is on, when a fill can be keyed on it. Undefined with an issue
 * when it can't, and null when the field has issues of its own, which the definition reports.
 */
function checkTrigger(
  target: ExtensionTarget,
  path: DefinitionPath,
  ctx: ExtensionContext,
  issues: Issues,
): ResolvedField | null | undefined {
  if (target.kind !== 'field' || target.field.kind === 'none') {
    const type = String(target.kind === 'field' ? target.field.type : target.json['type'])
    issues.add('kind_mismatch', path, `A ${type} has no value, so it can't fill fields`)
    return undefined
  }
  const { field } = target
  if (field.dataPath.includes('*')) {
    issues.add('invalid_shape', path, `A field inside a list's items can't have "fills"`)
    return undefined
  }
  if (field.kind === undefined) return null
  const dotPath = field.dataPath.join('.')
  if (!TRIGGER_KINDS.includes(field.kind)) {
    issues.add(
      'kind_mismatch',
      path,
      `"fills" can't be used on ${field.kind} fields, like "${dotPath}"`,
    )
    return undefined
  }
  // A field with a value and no issues, outside a list's items, is found by its own dot path.
  return ctx.resolve(dotPath, target) as ResolvedField
}

/**
 * The fields a fill sets, each once, with where it is first named. Undefined when one of them
 * can't be set, with an issue at each place it is named, or without one when it has issues of its
 * own. Also checks each value a map gives a field.
 */
function checkFields(
  named: readonly Named[],
  target: ExtensionTarget,
  ctx: ExtensionContext,
  issues: Issues,
): TargetFill['fields'] | undefined {
  const fields: { field: ResolvedField; at: DefinitionPath }[] = []
  // Each path is resolved once, and an issue reported at each place it is named.
  const found = new Map<string, ResolvedField | FieldIssue | null>()
  let all = true
  for (const each of named) {
    let field = found.get(each.path)
    if (field === undefined) {
      field = settable(each.path, target, ctx)
      found.set(each.path, field)
      if (field && !('code' in field)) fields.push({ field, at: each.at })
    }
    if (field === null) all = false
    else if ('code' in field) {
      issues.add(field.code, each.at, field.message)
      all = false
    } else if (each.value !== undefined) {
      checkValue(each.value, field, each.path, each.at, issues)
    }
  }
  return all ? fields : undefined
}

/** A field's issue: its code and message. */
interface FieldIssue {
  readonly code: 'unknown_field' | 'kind_mismatch'
  readonly message: string
}

/**
 * The field at a dot path when a fill can set it, the issue when it can't, or null when it has
 * issues of its own.
 */
function settable(
  dotPath: string,
  target: ExtensionTarget,
  ctx: ExtensionContext,
): ResolvedField | FieldIssue | null {
  const keys = dotPath.split('.')
  for (let at = 1; at < keys.length; at++) {
    const parent = ctx.resolve(keys.slice(0, at).join('.'), target)
    if (parent === null) return null
    if (typeof parent === 'object' && parent.role === 'array') {
      const message = `A fill can't set the fields of a list's items, like "${dotPath}"`
      return { code: 'unknown_field', message }
    }
  }
  const field = ctx.resolve(dotPath, target)
  if (field === null) return null
  if (typeof field === 'string') return { code: 'unknown_field', message: field }
  if (field.role === 'array') {
    const message = `A fill sets fields with a value, not the list "${dotPath}"`
    return { code: 'kind_mismatch', message }
  }
  if (field.role === 'group') {
    const first = firstSettable(field, target, ctx)
    const like = first === undefined ? '' : `, like "${first}"`
    const message = `A fill sets fields with a value, not the group "${dotPath}". Name its fields${like}`
    return { code: 'kind_mismatch', message }
  }
  if (holdsFile(field)) {
    return { code: 'kind_mismatch', message: `A fill can't set a file, like "${dotPath}"` }
  }
  return field
}

const holdsFile = (field: ResolvedField): boolean =>
  field.kind === 'file' || field.item?.kind === 'file'

/** The dot path of the first field of a group that the fill on `target` can set, if any. */
function firstSettable(
  group: ResolvedField,
  target: ExtensionTarget,
  ctx: ExtensionContext,
): string | undefined {
  const parent = group.field.dataPath
  for (const each of ctx.targets) {
    if (each.kind !== 'field' || each === target) continue
    const { dataPath } = each.field
    if (dataPath.length !== parent.length + 1 || parent.some((key, i) => dataPath[i] !== key)) {
      continue
    }
    const dotPath = dataPath.join('.')
    const field = ctx.resolve(dotPath, target)
    if (typeof field === 'object' && field?.role === 'value' && !holdsFile(field)) return dotPath
  }
  return undefined
}

/**
 * Adds an issue when the field can't hold a value a map gives it. `null` always fits, and so does
 * a value its kind counts as empty, like `""` for text or `[]` for a list.
 */
function checkValue(
  value: FillMapValue,
  field: ResolvedField,
  dotPath: string,
  at: DefinitionPath,
  issues: Issues,
): void {
  if (value === null || field.kindDef.isEmpty(value)) return
  const result = v.safeParse(field.schema, value)
  if (result.success) return
  const reason = result.issues[0].message
  issues.add('invalid_value', at, `"${dotPath}" can't hold ${JSON.stringify(value)}: ${reason}`)
}

/**
 * Adds an issue for each key of a map that is no value of the trigger, written as JSON writes it:
 * `"1"` for a number, `"true"` for a boolean.
 */
function checkKeys(
  map: Readonly<Record<string, unknown>>,
  trigger: ResolvedField,
  path: DefinitionPath,
  issues: Issues,
): void {
  const dotPath = trigger.field.dataPath.join('.')
  for (const key of Object.keys(map)) {
    const at = [...path, key]
    const value = keyValue(key, trigger.kind, dotPath)
    if (typeof value === 'object') {
      issues.add('invalid_value', at, value.message)
      continue
    }
    const result = v.safeParse(trigger.schema, value)
    if (result.success) continue
    const reason = result.issues[0].message
    issues.add('invalid_value', at, `"${dotPath}" can't hold ${JSON.stringify(key)}: ${reason}`)
  }
}

/** The value of the trigger a key of a map stands for, or why it stands for none. */
function keyValue(
  key: string,
  kind: string,
  dotPath: string,
): string | number | boolean | { message: string } {
  if (key === '') return { message: `An empty key is no value of "${dotPath}", so it never fills` }
  if (kind === 'number') {
    const number = Number(key)
    if (Number.isFinite(number) && String(number) === key) return number
    const message = `"${dotPath}" holds numbers, so a key is one as JSON writes it, like "1", not ${JSON.stringify(key)}`
    return { message }
  }
  if (kind === 'boolean') {
    if (key === 'true' || key === 'false') return key === 'true'
    const message = `"${dotPath}" is true or false, so a key is "true" or "false", not ${JSON.stringify(key)}`
    return { message }
  }
  return key
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

const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' ||
  (typeof value === 'number' && Number.isFinite(value)) ||
  typeof value === 'boolean'

const isMapValue = (value: unknown): value is FillMapValue =>
  value === null || isScalar(value) || (Array.isArray(value) && value.every(isScalar))
