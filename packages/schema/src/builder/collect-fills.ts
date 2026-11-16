import type { WalkedField } from '../definition/walked-field'
import {
  type DefinitionIssue,
  type DefinitionPath,
  formatPath,
  issue,
} from '../errors/definition-error'
import type { FieldTarget, TargetFill } from '../extensions/schema-extension'
import type { FillField, FillPlan, PlannedFill } from '../fills/fill-plan'
import { findLoops } from '../shared/find-loops'
import type { ValueKind } from '../shared/value-kind'

/** A field as fills see it: a field with a name and a value, without issues. */
export interface FillValue {
  readonly field: FillField
  readonly role: 'value' | 'group' | 'array'
}

/** What the fills of a definition need from the compiler. */
export interface FillFields {
  /** Every walked field, in document order. */
  readonly walked: readonly WalkedField[]
  /** True for a field of this definition's targets, as `ctx.targets` and `ctx.resolve()` give them. */
  isOwn(field: WalkedField): boolean
  /** The field as fills see it, or undefined when it has no name, no value, or issues. */
  valueOf(field: WalkedField): FillValue | undefined
}

/** The fills the extensions add with `ctx.fill()`. */
export interface FillCollector {
  /**
   * Checks a fill an extension adds, and keeps it, unless its trigger has issues of its own. Throws
   * a TypeError for one no form can run.
   */
  add(extension: string, trigger: FieldTarget, fill: TargetFill): void
  /**
   * The fills in the order they run, or undefined without any. Adds a `cycle` issue for each loop
   * of fills that set each other's triggers, and then gives none.
   */
  plan(issues: DefinitionIssue[]): FillPlan | undefined
}

/** One fill an extension added. */
interface Added {
  readonly trigger: WalkedField
  readonly fields: readonly { readonly field: WalkedField; readonly at: DefinitionPath }[]
  readonly fill: TargetFill
}

/** Kinds a fill can be keyed on: those of a single value a map's key can name. */
const TRIGGER_KINDS: ReadonlySet<ValueKind> = new Set(['string', 'number', 'boolean', 'date'])

export function collectFills(fields: FillFields): FillCollector {
  const added: Added[] = []

  function add(extension: string, trigger: FieldTarget, fill: TargetFill): void {
    const fail = (message: string): never => {
      throw new TypeError(`Extension "${extension}": ${message}`)
    }
    if (trigger.kind !== 'field' || !fields.isOwn(trigger.field)) {
      fail('ctx.fill() takes a field of ctx.targets')
    }
    // A trigger with issues of its own, like a duplicate name, has no value: the definition reports
    // them, and keeps no fill.
    if (trigger.field.kind === undefined) return
    const own = fields.valueOf(trigger.field)
    if (!own || own.role !== 'value' || !TRIGGER_KINDS.has(own.field.kind)) {
      fail(
        `a fill's trigger has a string, number, boolean or date value, unlike ${labelOf(trigger.field, fields)}`,
      )
    }
    if (trigger.field.dataPath.includes('*')) {
      fail(`a fill can't be on ${labelOf(trigger.field, fields)}, inside a list's items`)
    }
    if (fill.overwrite !== 'unedited' && fill.overwrite !== 'always') {
      fail(
        `the overwrite of a fill is 'unedited' or 'always', not ${JSON.stringify(fill.overwrite)}`,
      )
    }
    const seen = new Set<WalkedField>()
    for (const { field: resolved } of fill.fields) {
      const field = resolved.field
      if (!fields.isOwn(field)) fail('a fill sets the fields ctx.resolve() gives')
      const value = fields.valueOf(field)
      const label = labelOf(field, fields)
      if (!value || value.role !== 'value') fail(`a fill sets fields with a value, not ${label}`)
      if (value?.field.kind === 'file' || value?.field.itemKind === 'file') {
        fail(`a fill can't set a file, like ${label}`)
      }
      if (field.dataPath.includes('*')) fail(`a fill can't set ${label}, inside a list's items`)
      if (seen.has(field)) fail(`the fill of ${labelOf(trigger.field, fields)} sets ${label} twice`)
      seen.add(field)
    }
    added.push({
      trigger: trigger.field,
      fields: fill.fields.map(({ field, at }) => ({ field: field.field, at })),
      fill,
    })
  }

  function plan(issues: DefinitionIssue[]): FillPlan | undefined {
    if (!added.length) return undefined
    const byTrigger = new Map<WalkedField, Added[]>()
    for (const each of added) {
      byTrigger.set(each.trigger, [...(byTrigger.get(each.trigger) ?? []), each])
    }
    // The triggers in document order, each leading to the triggers its fills set.
    const triggers = fields.walked.filter((field) => byTrigger.has(field))
    const sets = (trigger: WalkedField): WalkedField[] => [
      ...new Set(
        (byTrigger.get(trigger) as Added[]).flatMap((each) =>
          each.fields.map(({ field }) => field).filter((field) => byTrigger.has(field)),
        ),
      ),
    ]

    const loops = findLoops(triggers, sets)
    for (const loop of loops) issues.push(loopIssue(loop, byTrigger, fields))
    if (loops.length) return undefined

    const fillField = (field: WalkedField) => (fields.valueOf(field) as FillValue).field
    const planned = runOrder(triggers, sets).flatMap((trigger) =>
      (byTrigger.get(trigger) as Added[]).map((each): PlannedFill => ({
        trigger: fillField(each.trigger),
        fields: each.fields.map(({ field }) => fillField(field)),
        target: each.fill,
      })),
    )
    return { fills: planned, triggers: triggers.map(fillField) }
  }

  return { add, plan }
}

/**
 * The triggers, each after every trigger whose fill sets it, otherwise in document order. They
 * have no loop.
 */
function runOrder(
  triggers: readonly WalkedField[],
  sets: (trigger: WalkedField) => readonly WalkedField[],
): WalkedField[] {
  const setBy = new Map<WalkedField, WalkedField[]>()
  for (const trigger of triggers) {
    for (const field of sets(trigger)) setBy.set(field, [...(setBy.get(field) ?? []), trigger])
  }
  const order: WalkedField[] = []
  const done = new Set<WalkedField>()
  const visit = (trigger: WalkedField) => {
    if (done.has(trigger)) return
    done.add(trigger)
    for (const before of setBy.get(trigger) ?? []) visit(before)
    order.push(trigger)
  }
  for (const trigger of triggers) visit(trigger)
  return order
}

/**
 * A loop of fills, reported where the last fill in it names the trigger first in the document,
 * which closes it.
 */
function loopIssue(
  loop: readonly WalkedField[],
  byTrigger: ReadonlyMap<WalkedField, readonly Added[]>,
  fields: FillFields,
): DefinitionIssue {
  const first = loop[0] as WalkedField
  const last = loop.at(-1) as WalkedField
  const at = (byTrigger.get(last) as Added[])
    .flatMap((each) => each.fields)
    .find(({ field }) => field === first)?.at as DefinitionPath
  if (loop.length === 1) return issue('cycle', at, `${labelOf(first, fields)} fills itself`)
  const names = [...loop, first].map((field) => labelOf(field, fields)).join(' → ')
  return issue('cycle', at, `Fills set each other in a loop: ${names}`)
}

/** `"address.city"` for a field with a value, or what it is and where. */
function labelOf(field: WalkedField, fields: FillFields): string {
  const value = fields.valueOf(field)
  if (value) return `"${value.field.dotPath}"`
  return `the ${field.type} at ${formatPath(field.definitionPath)}`
}
