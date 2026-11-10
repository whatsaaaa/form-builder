import type { WalkedField } from '../definition/walked-field'
import {
  type DefinitionIssue,
  type DefinitionPath,
  formatPath,
  issue,
} from '../errors/definition-error'
import type {
  ExtensionContext,
  ExtensionTarget,
  ResolvedField,
  TargetConditions,
} from '../extensions/schema-extension'
import type { FormLayout, LayoutNode } from '../render/form-layout'
import type { AnySchema } from '../shared/valibot-types'
import { createEngine, type Engine, findCycles, keyOf, type Unit } from '../visibility/engine'
import { type FieldsByPath, findField, outsideItem } from './check-form-rules'
import { lookup, type Registry } from './registry'
import type { CheckedField } from './validate-definition'

/** What the compiler built, that the extensions read. */
export interface Built {
  readonly walked: readonly WalkedField[]
  readonly fieldsByPath: FieldsByPath
  readonly schemas: ReadonlyMap<CheckedField, AnySchema>
  /** Undefined when the fields or the layout have issues. */
  readonly layout: FormLayout | undefined
}

/**
 * Runs the check of each extension, adds their issues to `issues`, and checks that no conditions
 * depend on each other in a loop. Returns the engine that works out what the conditions hide, or
 * undefined without extensions.
 */
export function checkExtensions(
  registry: Registry,
  built: Built,
  issues: DefinitionIssue[],
): Engine | undefined {
  if (!registry.extensions.length) return undefined
  const lookups = createLookups(built)
  const { targets, units, fieldUnits } = createUnits(registry, built, lookups)
  const conditions = new Map<ExtensionTarget, TargetConditions[]>()

  const ctx: ExtensionContext = {
    targets: targets.map(({ target }) => target),
    resolve: (dotPath, from) => resolve(dotPath, from, built, lookups),
    issue: (code, path, message) => issues.push(issue(code, path, message)),
  }
  for (const extension of registry.extensions) {
    for (const [target, own] of extension.check(ctx)) {
      conditions.set(target, [...(conditions.get(target) ?? []), own])
    }
  }

  for (const { target, unit } of targets) {
    const list = conditions.get(target)
    if (!list) continue
    const merged = merge(list)
    const reads = merged.reads.map(({ field }) => fieldUnits.get(field.field) as Unit)
    unit.conditions = { target: merged, reads }
  }

  const cycles = findCycles(units)
  for (const loop of cycles) {
    const names = [...loop, loop[0] as Unit].map((unit) => unit.label).join(' → ')
    issues.push(
      issue('cycle', readInLoop(loop), `Conditions depend on each other in a loop: ${names}`),
    )
  }
  return cycles.length ? undefined : createEngine(units)
}

/**
 * The field at a dot path read from `from`, as form rules find it. A field of a list's items is
 * read from the same item, so `from` must be in it too.
 */
function resolve(
  dotPath: string,
  from: ExtensionTarget,
  built: Built,
  lookups: Lookups,
): ResolvedField | string | null {
  const keys = dotPath.split('.')
  const found = findField(keys, built.fieldsByPath)
  if (typeof found === 'string' || found === null) return found
  // The field of a list of single values has no name: its value is the item itself.
  if (found.name === undefined) return `Unknown field "${dotPath}"`
  const fromKeys = (from.kind === 'field' ? from.field.dataPath : from.dataPath).map(String)
  const named = from.kind === 'field' && from.field.field.name !== undefined
  const outside = outsideItem(keys, fromKeys, named ? undefined : `the ${nameOf(from)}`)
  if (outside) return outside

  // A field with a value and no issues has been walked and built.
  const field = lookups.walked.get(keyOf(found.path)) as WalkedField
  const schema = built.schemas.get(found) as AnySchema
  return {
    field,
    kind: found.valueKind,
    kindDef: found.kind,
    schema,
    item: found.valueKind === 'array' ? itemOf(found, field, schema, built) : undefined,
  }
}

/** The kind and schema of each item of a field of kind `array`, when they have a value. */
function itemOf(
  checked: CheckedField,
  field: WalkedField,
  schema: AnySchema,
  built: Built,
): ResolvedField['item'] {
  // A list of single values: its `of` field.
  const of = built.fieldsByPath.get(`${field.dataPath.join('.')}.*`)
  if (of) return { kind: of.valueKind, schema: built.schemas.get(of) as AnySchema }
  // A type with items of its own kind, like a multiselect: the item of its array schema.
  if (checked.itemKind === undefined) return undefined
  const item = itemSchemaOf(schema)
  return item && { kind: checked.itemKind, schema: item }
}

/** The schema of an array's items, inside the optional and pipe schemas around it. */
function itemSchemaOf(schema: AnySchema): AnySchema | undefined {
  let at = schema as { type: string; wrapped?: AnySchema; item?: AnySchema }
  while (at.wrapped && WRAPPERS.has(at.type)) at = at.wrapped as typeof at
  return at.type === 'array' ? at.item : undefined
}

const WRAPPERS: ReadonlySet<string> = new Set([
  'optional',
  'non_optional',
  'exact_optional',
  'nullable',
  'non_nullable',
  'nullish',
  'non_nullish',
  'undefinedable',
])

/** The conditions of several extensions on one target: any of them hides it, or clears it. */
function merge(list: readonly TargetConditions[]): TargetConditions {
  if (list.length === 1) return list[0] as TargetConditions
  return {
    reads: list.flatMap((conditions) => conditions.reads),
    evaluate(read) {
      let hidden = false
      let clear = false
      let offset = 0
      for (const conditions of list) {
        const start = offset
        const state = conditions.evaluate((i) => read(start + i))
        hidden ||= state.hidden
        clear ||= state.clear
        offset += conditions.reads.length
      }
      return { hidden, clear }
    },
  }
}

/**
 * Where to report a loop: the first condition in it, from the unit first in the definition, that
 * reads the next unit. A loop always goes through a condition.
 */
function readInLoop(loop: readonly Unit[]): DefinitionPath {
  const reads = loop.flatMap((unit, i) => {
    const next = loop[(i + 1) % loop.length] as Unit
    const at = unit.conditions?.reads.indexOf(next) ?? -1
    return at === -1 ? [] : [unit.conditions?.target.reads[at]?.at as DefinitionPath]
  })
  return reads[0] as DefinitionPath
}

interface TargetUnit {
  readonly target: ExtensionTarget
  readonly unit: Unit
}

/**
 * A target and a unit for each field, and for each step, section and display element of the
 * layout. A field is in its group or array, and in the step or section the layout places it in.
 */
function createUnits(registry: Registry, built: Built, lookups: Lookups) {
  const targets: TargetUnit[] = []
  const units: Unit[] = []
  const fieldUnits = new Map<WalkedField, Unit>()
  const byPath = new Map<string, Unit>()

  const add = (unit: Unit, target: ExtensionTarget) => {
    units.push(unit)
    byPath.set(unit.key, unit)
    targets.push({ target, unit })
  }

  // A container comes before its fields, so the last one at the depth above holds the field.
  const containers: Unit[] = []
  for (const field of built.walked) {
    const checked = lookups.checked.get(keyOf(field.definitionPath))
    const unit = createUnit(field.definitionPath, labelOfField(field), field.dataPath, {
      value: valueOf(field, checked, registry),
    })
    containers.length = field.depth
    addParent(unit, containers.at(-1))
    containers.push(unit)
    fieldUnits.set(field, unit)
    add(unit, { kind: 'field', field, json: field.field, definitionPath: field.definitionPath })
  }

  for (const step of built.layout?.steps ?? []) {
    const json = step.step as unknown as Record<string, unknown>
    const unit = createUnit(
      step.definitionPath,
      labelOfLayout('step', json, step.definitionPath),
      [],
    )
    add(unit, { kind: 'step', json, definitionPath: step.definitionPath, dataPath: [] })
    visit(step.children, unit, undefined, [])
  }

  /**
   * `layout` is the step, section or array the nodes are in, and `field` the group or array.
   * A field placed in a step or a section is in it. A group isn't: the fields the layout places in
   * it are, as the layout can place its other fields elsewhere.
   */
  function visit(
    nodes: readonly LayoutNode[],
    layout: Unit,
    field: Unit | undefined,
    scope: readonly (string | number)[],
  ): void {
    for (const node of nodes) {
      if (node.type === 'slot') continue
      if (node.type === 'row') {
        visit(node.children, layout, field, scope)
        continue
      }
      if (node.type === 'section') {
        const json = node.section as unknown as Record<string, unknown>
        const unit = createUnit(
          node.definitionPath,
          labelOfLayout('section', json, node.definitionPath),
          scope,
        )
        addParent(unit, layout)
        addParent(unit, field)
        add(unit, { kind: 'section', json, definitionPath: node.definitionPath, dataPath: scope })
        visit(node.children, unit, field, scope)
        continue
      }
      const { node: fieldNode } = node
      const own = byPath.get(keyOf(fieldNode.definitionPath))
      if (!own) {
        // A display element written in the layout.
        const json = fieldNode.field as Record<string, unknown>
        const label = labelOfLayout(fieldNode.type, json, fieldNode.definitionPath)
        const unit = createUnit(fieldNode.definitionPath, label, scope)
        addParent(unit, layout)
        addParent(unit, field)
        add(unit, {
          kind: 'display',
          json,
          definitionPath: fieldNode.definitionPath,
          dataPath: scope,
        })
        continue
      }
      if (fieldNode.role === 'group') {
        visit(node.children, layout, own, fieldNode.dataPath)
        continue
      }
      addParent(own, layout)
      if (fieldNode.role === 'array') visit(node.children, own, own, [...fieldNode.dataPath, '*'])
    }
  }

  return { targets, units, fieldUnits }
}

function createUnit(
  definitionPath: DefinitionPath,
  label: string,
  scope: readonly (string | number)[],
  { value }: Pick<Unit, 'value'> = { value: undefined },
): Unit {
  return {
    key: keyOf(definitionPath),
    definitionPath,
    label,
    value,
    scope,
    stars: scope.filter((key) => key === '*').length,
    parents: [],
    conditions: undefined,
  }
}

function addParent(unit: Unit, parent: Unit | undefined): void {
  if (parent && parent !== unit && !unit.parents.includes(parent)) unit.parents.push(parent)
}

/** What holds the value of a field with a name and a value, without issues. */
function valueOf(
  field: WalkedField,
  checked: CheckedField | undefined,
  registry: Registry,
): Unit['value'] {
  if (!checked || checked.name === undefined) return undefined
  const container = lookup(registry.fieldTypes, field.type)?.container === true
  const role = !container ? 'value' : checked.valueKind === 'array' ? 'array' : 'group'
  return { dataPath: field.dataPath, role, isEmpty: (input) => checked.kind.isEmpty(input) }
}

/** `"address.city"` for a field with a value, or what it is and where. */
function labelOfField(field: WalkedField): string {
  if (field.kind !== 'none' && field.field.name !== undefined)
    return `"${field.dataPath.join('.')}"`
  return `the ${field.type} at ${formatPath(field.definitionPath)}`
}

/** `step "company"` with an id, or what it is and where. */
function labelOfLayout(what: string, json: Record<string, unknown>, path: DefinitionPath): string {
  return typeof json['id'] === 'string'
    ? `${what} "${json['id']}"`
    : `the ${what} at ${formatPath(path)}`
}

/** What a target is, for messages: `step`, `section`, or its type, like `heading`. */
function nameOf(target: ExtensionTarget): string {
  if (target.kind === 'field') return target.field.type
  return target.kind === 'display' ? String(target.json['type']) : target.kind
}

/** The walked and the checked fields, by the JSON of their definition path. */
interface Lookups {
  readonly walked: ReadonlyMap<string, WalkedField>
  /** Only the fields that have no issues, and have a value. */
  readonly checked: ReadonlyMap<string, CheckedField>
}

function createLookups(built: Built): Lookups {
  return {
    walked: new Map(built.walked.map((field) => [keyOf(field.definitionPath), field])),
    checked: new Map([...built.schemas.keys()].map((field) => [keyOf(field.path), field])),
  }
}
