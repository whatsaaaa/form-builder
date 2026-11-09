import type { DefinitionPath } from '../errors/definition-error'
import type { TargetConditions } from '../extensions/schema-extension'
import { type FieldPath, toFieldPath } from '../render/to-field-path'

type DataPath = readonly (string | number)[]

/**
 * A field, or a step, section or display element of the layout: one thing conditions can hide.
 * It has one instance per item of each array it is in.
 */
export interface Unit {
  /** Its definition path as JSON, which names it. */
  readonly key: string
  readonly definitionPath: DefinitionPath
  /** How messages name it: `"address.city"`, or `step "company"`. */
  readonly label: string
  /** For a field with a name and a value: where the value is, and what holds it. */
  readonly value: UnitValue | undefined
  /** The data path its instances are at: a field's own, or that of the fields around a node. */
  readonly scope: DataPath
  /** The number of `'*'` in `scope`: how many indexes an instance has. */
  readonly stars: number
  /** The groups, arrays, sections and steps it is in. Each one hidden hides it. */
  readonly parents: Unit[]
  /** Its own conditions, with the unit of each field they read. */
  conditions: { readonly target: TargetConditions; readonly reads: readonly Unit[] } | undefined
}

export interface UnitValue {
  readonly dataPath: DataPath
  readonly role: 'value' | 'group' | 'array'
  /** The kind's check for "no value", for whether a cleared field still holds something. */
  isEmpty(input: unknown): boolean
}

export interface UnitState {
  readonly hidden: boolean
  /** True when it is hidden and its value cleared. */
  readonly clear: boolean
}

const VISIBLE: UnitState = { hidden: false, clear: false }

/** A hidden field with a value, at its Formisch path. */
export interface HiddenField {
  readonly path: FieldPath
  readonly role: UnitValue['role']
  readonly clear: boolean
}

/** A field to set to its blank input, because it is cleared and still holds something. */
export interface ToClear {
  readonly path: FieldPath
  /** Undefined, or `[]` for an array, whose items go too. */
  readonly input: unknown
}

/** What is hidden for one input. */
export interface Evaluation {
  /** The state of one instance of a unit: `indexes` are those of the items it is in. */
  stateOf(unit: Unit, indexes: readonly number[]): UnitState
  /** Every hidden instance of a field with a name and a value, the deepest first. */
  readonly hiddenFields: readonly HiddenField[]
  /** True when the field with a value at this Formisch path is hidden. */
  isHiddenAt(path: FieldPath): boolean
  /** The cleared fields that still hold something, outside any array that is cleared. */
  readonly toClear: readonly ToClear[]
  /** Names what is hidden and cleared, so two evaluations can be compared. */
  readonly signature: string
}

/** Works out the state of every unit for an input. `units` holds every unit, in any order. */
export interface Engine {
  /** True when a unit has conditions, so what is hidden depends on the input. */
  readonly conditional: boolean
  /** The unit at a definition path. */
  unitAt(definitionPath: DefinitionPath): Unit | undefined
  /** True for the unit at a definition path when conditions can hide it: it needs a gate. */
  canHide(definitionPath: DefinitionPath): boolean
  evaluate(input: unknown): Evaluation
}

/**
 * The engine for `units`, whose parents and reads have no cycle: `findCycles` finds those first.
 * Only the units with conditions, and the units inside them, are ever hidden, so only they are
 * evaluated, a unit after everything it depends on.
 */
export function createEngine(units: readonly Unit[]): Engine {
  const byKey = new Map(units.map((unit) => [unit.key, unit]))
  const canHide = hideable(units)
  const order = topologicalOrder(canHide)

  function evaluate(input: unknown): Evaluation {
    const states = new Map<Unit, Map<string, UnitState>>()
    const stateOf = (unit: Unit, indexes: readonly number[]): UnitState =>
      states.get(unit)?.get(indexes.slice(0, unit.stars).join()) ?? VISIBLE

    // A field reads as empty while it is hidden, so a chain of conditions follows the first.
    const read = (field: Unit, indexes: readonly number[]): unknown => {
      if (stateOf(field, indexes).hidden) return undefined
      return valueAt(
        input,
        toFieldPath((field.value as UnitValue).dataPath, indexes.slice(0, field.stars)),
      )
    }

    for (const unit of order) {
      const byItem = new Map<string, UnitState>()
      states.set(unit, byItem)
      for (const indexes of indexesOf(unit.scope, input)) {
        let hidden = false
        let clear = false
        for (const parent of unit.parents) {
          const state = stateOf(parent, indexes)
          hidden ||= state.hidden
          clear ||= state.clear
        }
        const { conditions } = unit
        if (conditions) {
          const own = conditions.target.evaluate((i) => read(conditions.reads[i] as Unit, indexes))
          hidden ||= own.hidden || own.clear
          clear ||= own.clear
        }
        if (hidden) byItem.set(indexes.join(), { hidden, clear })
      }
    }
    return evaluation(input, order, states)
  }

  return {
    conditional: units.some((unit) => unit.conditions),
    unitAt: (definitionPath) => byKey.get(keyOf(definitionPath)),
    canHide: (definitionPath) => canHide.has(byKey.get(keyOf(definitionPath)) as Unit),
    evaluate,
  }
}

export const keyOf = (definitionPath: DefinitionPath): string => JSON.stringify(definitionPath)

/** What the states of the units make hidden and cleared. */
function evaluation(
  input: unknown,
  order: readonly Unit[],
  states: ReadonlyMap<Unit, ReadonlyMap<string, UnitState>>,
): Evaluation {
  const stateOf = (unit: Unit, indexes: readonly number[]): UnitState =>
    states.get(unit)?.get(indexes.slice(0, unit.stars).join()) ?? VISIBLE
  const fields: (HiddenField & { unit: Unit })[] = []
  const names: string[] = []
  for (const unit of order) {
    // The engine evaluated every unit of `order`.
    for (const [item, state] of states.get(unit) as ReadonlyMap<string, UnitState>) {
      names.push(`${unit.key}@${item}${state.clear ? '!' : ''}`)
      if (!unit.value) continue
      const indexes = item ? item.split(',').map(Number) : []
      const path = toFieldPath(unit.value.dataPath, indexes)
      fields.push({ path, role: unit.value.role, clear: state.clear, unit })
    }
  }
  fields.sort((a, b) => b.path.length - a.path.length)

  const hiddenPaths = new Set(fields.map((field) => JSON.stringify(field.path)))
  const toClear = toClearOf(input, fields)
  return {
    stateOf,
    hiddenFields: fields.map(({ path, role, clear }) => ({ path, role, clear })),
    isHiddenAt: (path) => hiddenPaths.has(JSON.stringify(path)),
    toClear,
    signature: [...names, ...toClear.map((field) => JSON.stringify(field.path))].join('|'),
  }
}

/**
 * The cleared fields and arrays that still hold something. The fields inside a cleared array go
 * with its items, so they aren't listed. A group isn't either: its fields are.
 */
function toClearOf(input: unknown, fields: readonly (HiddenField & { unit: Unit })[]): ToClear[] {
  const arrays = fields.filter((field) => field.clear && field.role === 'array')
  const inArray = (path: FieldPath) =>
    arrays.some(
      (array) => array.path.length < path.length && array.path.every((key, i) => key === path[i]),
    )
  return fields.flatMap(({ path, role, clear, unit }): ToClear[] => {
    if (!clear || role === 'group' || inArray(path)) return []
    const value = valueAt(input, path)
    if (role === 'array') return Array.isArray(value) && value.length ? [{ path, input: [] }] : []
    return (unit.value as UnitValue).isEmpty(value) ? [] : [{ path, input: undefined }]
  })
}

/** The units with conditions, and every unit inside one: the only ones that can be hidden. */
function hideable(units: readonly Unit[]): Set<Unit> {
  const children = new Map<Unit, Unit[]>()
  for (const unit of units) {
    for (const parent of unit.parents) children.set(parent, [...(children.get(parent) ?? []), unit])
  }
  const found = new Set<Unit>()
  const add = (unit: Unit) => {
    if (found.has(unit)) return
    found.add(unit)
    for (const child of children.get(unit) ?? []) add(child)
  }
  for (const unit of units) if (unit.conditions) add(unit)
  return found
}

/** What a unit depends on: its parents, and the fields its conditions read. */
const dependencies = (unit: Unit): readonly Unit[] => [
  ...unit.parents,
  ...(unit.conditions?.reads ?? []),
]

/** The units, each after the ones it depends on. The units have no cycle. */
function topologicalOrder(units: ReadonlySet<Unit>): Unit[] {
  const order: Unit[] = []
  const done = new Set<Unit>()
  const visit = (unit: Unit) => {
    if (done.has(unit) || !units.has(unit)) return
    done.add(unit)
    for (const dependency of dependencies(unit)) visit(dependency)
    order.push(unit)
  }
  for (const unit of units) visit(unit)
  return order
}

/**
 * Each loop of units that depend on each other, as the units around it, starting with the one
 * first in the definition. A unit depends on its parents and on what its conditions read, so a
 * loop always goes through a condition.
 */
export function findCycles(units: readonly Unit[]): Unit[][] {
  const position = new Map(units.map((unit, i) => [unit, i]))
  const cycles: Unit[][] = []
  for (const component of stronglyConnected(units)) {
    const inLoop = new Set(component)
    const first = units.find((unit) => inLoop.has(unit)) as Unit
    // A unit on its own is a loop only when it depends on itself.
    if (component.length === 1 && !dependencies(first).includes(first)) continue
    cycles.push(loopFrom(first, inLoop))
  }
  return cycles.sort(
    (a, b) => (position.get(a[0] as Unit) as number) - (position.get(b[0] as Unit) as number),
  )
}

/** The shortest way from `start` back to itself through `inLoop`, as its units. */
function loopFrom(start: Unit, inLoop: ReadonlySet<Unit>): Unit[] {
  // Each unit after the one it was first reached from, nearest first.
  const previous = new Map<Unit, Unit>([[start, start]])
  const queue = [start]
  for (const unit of queue) {
    for (const next of dependencies(unit)) {
      if (!inLoop.has(next) || previous.has(next)) continue
      previous.set(next, unit)
      queue.push(next)
    }
  }
  // The units form a loop, so one of them depends on `start`: the nearest closes it.
  const loop = [queue.find((unit) => dependencies(unit).includes(start)) as Unit]
  while (loop[0] !== start) loop.unshift(previous.get(loop[0] as Unit) as Unit)
  return loop
}

/** Tarjan's strongly connected components of the dependency graph. */
function stronglyConnected(units: readonly Unit[]): Unit[][] {
  let next = 0
  const index = new Map<Unit, number>()
  const low = new Map<Unit, number>()
  const stack: Unit[] = []
  const onStack = new Set<Unit>()
  const components: Unit[][] = []

  const visit = (unit: Unit) => {
    index.set(unit, next)
    low.set(unit, next)
    next++
    stack.push(unit)
    onStack.add(unit)
    for (const dependency of dependencies(unit)) {
      if (!index.has(dependency)) {
        visit(dependency)
        low.set(unit, Math.min(low.get(unit) as number, low.get(dependency) as number))
      } else if (onStack.has(dependency)) {
        low.set(unit, Math.min(low.get(unit) as number, index.get(dependency) as number))
      }
    }
    if (low.get(unit) !== index.get(unit)) return
    const component: Unit[] = []
    let member: Unit
    do {
      member = stack.pop() as Unit
      onStack.delete(member)
      component.push(member)
    } while (member !== unit)
    components.push(component)
  }

  for (const unit of units) if (!index.has(unit)) visit(unit)
  return components
}

/** The indexes of every item `scope` has in `input`, one list per instance, outermost first. */
export function indexesOf(scope: DataPath, input: unknown): number[][] {
  let instances: { path: DataPath; indexes: number[] }[] = [{ path: [], indexes: [] }]
  for (const key of scope) {
    instances = instances.flatMap(({ path, indexes }) => {
      if (key !== '*') return [{ path: [...path, key], indexes }]
      const items = valueAt(input, path)
      if (!Array.isArray(items)) return []
      return items.map((_, i) => ({ path: [...path, i], indexes: [...indexes, i] }))
    })
  }
  return instances.map(({ indexes }) => indexes)
}

export function valueAt(input: unknown, path: readonly (string | number)[]): unknown {
  let value = input
  for (const key of path) {
    value =
      typeof value === 'object' && value !== null
        ? (value as Record<string | number, unknown>)[key]
        : undefined
  }
  return value
}
