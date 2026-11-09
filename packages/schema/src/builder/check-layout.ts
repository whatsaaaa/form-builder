import type { JsonField } from '../definition/json-form-schema'
import {
  type JsonLayoutRow,
  type JsonLayoutSection,
  type JsonLayoutStep,
  ROW_COLUMNS,
} from '../definition/json-layout'
import type { WalkedField } from '../definition/walk-fields'
import {
  type DefinitionIssue,
  type DefinitionPath,
  formatPath,
  issue,
} from '../errors/definition-error'
import { type FieldNode, fieldTree } from '../render/field-tree'
import type { FormLayout, LayoutNode, LayoutStep } from '../render/form-layout'
import { lookup, type Registry } from './registry'
import { checkField } from './validate-definition'

/** The fields one list of layout items places: the form's, or those of a container. */
interface Scope {
  /** Undefined when the fields have issues: then no reference is resolved. */
  readonly nodes: readonly FieldNode[] | undefined
  /** Where the values of the scope's fields are: `[]`, `['address']` or `['lines', '*']`. */
  readonly dataPath: readonly (string | number)[]
  /** The group or array whose fields these are. Undefined for the form's. */
  readonly container: FieldNode | undefined
  /** True inside the items of an array. */
  readonly inItems: boolean
  /** The group each field inside a group is in. */
  readonly parents: ReadonlyMap<FieldNode, FieldNode>
  /** The fields placed by name. */
  readonly placed: Set<FieldNode>
  /** The groups with a field inside placed by name. */
  readonly holding: Set<FieldNode>
  /** Where the scope's `"*"` is. */
  rest: DefinitionPath | undefined
  /** True when a list of the scope's items, or a step, is malformed: fields go unplaced then. */
  broken: boolean
}

/** A layout item, checked, with the fields it places resolved. `span` is in its row, or 12. */
type Item =
  | { kind: 'field'; node: FieldNode; span: number; items?: { list: Item[]; scope: Scope } }
  | { kind: 'rest'; scope: Scope }
  | { kind: 'section'; json: JsonLayoutSection; path: DefinitionPath; list: Item[]; span: number }
  | { kind: 'row'; json: JsonLayoutRow; path: DefinitionPath; list: Item[]; span: number }
  | { kind: 'slot'; name: string; span: number }
  | { kind: 'display'; node: FieldNode; span: number }

/** A layout node before it gets its key, which is its index among its siblings. */
type Unkeyed = LayoutNode extends infer T ? (T extends LayoutNode ? Omit<T, 'key'> : never) : never

const ROOT: DefinitionPath = ['layout']

/** A step, checked, with its items. */
interface CheckedStep {
  json: JsonLayoutStep
  path: DefinitionPath
  list: Item[]
}

/**
 * Checks the definition's layout and resolves it against the fields, and adds its issues to
 * `issues`. `walked` is undefined when the fields have issues: then only the layout's own shape is
 * checked. Returns the layout when it has no issues, or the default one when there is none.
 */
export function checkLayout(
  raw: unknown,
  walked: readonly WalkedField[] | undefined,
  registry: Registry,
  issues: DefinitionIssue[],
): FormLayout | undefined {
  const tree =
    walked && fieldTree(walked, (type) => lookup(registry.fieldTypes, type)?.container === true)
  if (raw === undefined) {
    const steps = tree && [stepOf({ items: ['*'] }, [], keyed(tree.map(fullLayout)))]
    return steps && { steps, ui: undefined }
  }

  const issueCount = issues.length
  const ids = new Map<string, DefinitionPath>()
  // The keys the extensions add to steps and sections, like `affects`.
  const extensionKeys = registry.extensions.flatMap((extension) =>
    Object.keys(extension.layoutProps?.entries ?? {}),
  )
  const definitionPaths = new Map(walked?.map((field) => [field.field, field.definitionPath]))

  const steps = checkRoot(raw)
  if (!steps || !tree || issues.length > issueCount) return undefined
  return {
    steps: steps.map(({ json, path, list }) => stepOf(json, path, build(list))),
    ui: (raw as { ui?: Record<string, unknown> }).ui,
  }

  /** The layout's steps, checked, with the items of each. */
  function checkRoot(layout: unknown): CheckedStep[] | undefined {
    if (!isObject(layout)) {
      report('invalid_shape', ROOT, 'The layout is an object with "items" or "steps"')
      return undefined
    }
    checkKeys(layout, ['items', 'steps', 'ui'], ROOT, 'the layout')
    checkUi(layout, ROOT)
    const hasItems = Object.hasOwn(layout, 'items')
    const hasSteps = Object.hasOwn(layout, 'steps')
    if (hasItems === hasSteps) {
      report('invalid_shape', ROOT, 'Give exactly one of "items" and "steps"')
      if (!hasItems) return undefined
    }

    const scope = createScope(tree, [], undefined, false)
    let steps: CheckedStep[]
    if (hasItems) {
      const json = { items: layout['items'] as never }
      steps = [{ json, path: ROOT, list: checkItems(layout, ROOT, scope) }]
    } else {
      const raws = layout['steps']
      const at = [...ROOT, 'steps']
      if (!Array.isArray(raws) || !raws.length) {
        report('invalid_shape', at, 'Give a list of at least one step')
        return undefined
      }
      steps = raws.flatMap((step, i) => checkStep(step, [...at, i], scope) ?? [])
    }
    checkPlaced(scope, ROOT)
    return steps
  }

  function checkStep(raw: unknown, path: DefinitionPath, scope: Scope): CheckedStep | undefined {
    if (!isObject(raw)) {
      report('invalid_shape', path, 'A step is an object with "items"')
      scope.broken = true
      return undefined
    }
    checkKeys(raw, ['id', 'label', 'description', 'items', 'ui', ...extensionKeys], path, 'a step')
    checkId(raw, path)
    checkText(raw, ['label', 'description'], path)
    checkUi(raw, path)
    return { json: raw as unknown as JsonLayoutStep, path, list: checkItems(raw, path, scope) }
  }

  /**
   * The `items` of `owner`, which must be a list of at least one item. In a row, each item gets
   * its span: its own, or an equal share of the columns the others leave.
   */
  function checkItems(
    owner: Record<string, unknown>,
    path: DefinitionPath,
    scope: Scope,
    row = false,
  ): Item[] {
    const raws = owner['items']
    const at = [...path, 'items']
    if (!Array.isArray(raws) || !raws.length) {
      report('invalid_shape', at, 'Give a list of at least one item')
      scope.broken = true
      return []
    }
    const spans = row ? rowSpans(raws, path) : undefined
    return raws.flatMap((raw, i) => checkItem(raw, [...at, i], scope, spans?.[i]) ?? [])
  }

  /**
   * The span of each item of a row. The spans given add up to 12 at most, and the items without
   * one share what is left equally.
   */
  function rowSpans(raws: readonly unknown[], path: DefinitionPath): number[] {
    const given = raws.map((raw) => (isObject(raw) ? raw['span'] : undefined))
    const used = given.reduce<number>((sum, span) => sum + (isSpan(span) ? span : 0), 0)
    const shared = given.filter((span) => span === undefined).length
    const left = ROW_COLUMNS - used
    const share = shared ? Math.floor(left / shared) : 0
    // A span that is no whole number from 1 to 12 has its own issue.
    if (given.every((span) => span === undefined || isSpan(span))) {
      if (left < 0) {
        const message = `A row has ${ROW_COLUMNS} columns, and its spans add up to ${used}. Put the rest in another row`
        report('invalid_shape', path, message)
      } else if (shared && (share === 0 || left % shared)) {
        const items = shared === 1 ? '1 item' : `${shared} items`
        const message = `The spans leave ${left} of ${ROW_COLUMNS} columns to share evenly between ${items} without a span. Give them a span`
        report('invalid_shape', path, message)
      }
    }
    return given.map((span) => (isSpan(span) ? span : share))
  }

  /** `cell` is the item's span when it is in a row. */
  function checkItem(
    raw: unknown,
    path: DefinitionPath,
    scope: Scope,
    cell: number | undefined,
  ): Item | undefined {
    if (raw === '*') return checkRest(path, scope, cell)
    const span = cell ?? ROW_COLUMNS
    if (typeof raw === 'string') return checkRef(raw, path, scope, span)
    if (!isObject(raw)) {
      const message = 'A layout item is a dot path, "*", or an object with "field" or "type"'
      report('invalid_shape', path, message)
      return undefined
    }
    checkSpan(raw, path, cell)
    if (Object.hasOwn(raw, 'field')) return checkFieldItem(raw, path, scope, span)
    switch (raw['type']) {
      case 'section':
      case 'row':
        return checkBlock(raw, path, scope, span, raw['type'])
      case 'slot':
        return checkSlot(raw, path, scope, span)
      default:
        return checkDisplay(raw, path, scope, span)
    }
  }

  function checkRest(
    path: DefinitionPath,
    scope: Scope,
    cell: number | undefined,
  ): Item | undefined {
    if (cell !== undefined) {
      const message = `The cells of a row are fixed, so "*" can't be one. Put it in a section in the row`
      report('invalid_shape', path, message)
    } else if (scope.rest) {
      const message = `"*" places every field not placed elsewhere, so it goes once. It is at ${formatPath(scope.rest)} already`
      report('invalid_shape', path, message)
    } else {
      scope.rest = path
      return { kind: 'rest', scope }
    }
    return undefined
  }

  function checkSpan(raw: Record<string, unknown>, path: DefinitionPath, cell: number | undefined) {
    if (!Object.hasOwn(raw, 'span')) return
    if (cell === undefined) {
      const message = '"span" is for an item of a row'
      report('invalid_shape', [...path, 'span'], message)
    } else if (!isSpan(raw['span'])) {
      const message = `"span" is a whole number from 1 to ${ROW_COLUMNS}`
      report('invalid_shape', [...path, 'span'], message)
    }
  }

  /** A field placed by its dot path. `at` is where the path is: the item, or its `field` key. */
  function checkRef(ref: string, at: DefinitionPath, scope: Scope, span: number): Item | undefined {
    const node = resolve(ref, at, scope)
    return node && place(node, at, scope) ? { kind: 'field', node, span } : undefined
  }

  function checkFieldItem(
    raw: Record<string, unknown>,
    path: DefinitionPath,
    scope: Scope,
    span: number,
  ): Item | undefined {
    checkKeys(raw, ['field', 'items', 'span'], path, 'a field in the layout')
    const ref = raw['field']
    const at = [...path, 'field']
    if (typeof ref !== 'string') {
      report('invalid_shape', at, '"field" is a dot path, like "address.city"')
      return undefined
    }
    const item = checkRef(ref, at, scope, span)
    if (!Object.hasOwn(raw, 'items')) return item

    const node = item?.kind === 'field' ? item.node : undefined
    const inner =
      (node && innerScope(node, [...path, 'items'], scope.inItems)) ??
      createScope(undefined, [], undefined, scope.inItems)
    const list = checkItems(raw, path, inner)
    checkPlaced(inner, [...path, 'items'])
    return node && { kind: 'field', node, span, items: { list, scope: inner } }
  }

  /**
   * The scope of a group's or array's fields. Adds an issue when the field holds none. `inItems`
   * tells whether the field is in an array's items.
   */
  function innerScope(node: FieldNode, at: DefinitionPath, inItems: boolean): Scope | undefined {
    const dot = dotOf(node)
    if (node.role === 'group') return createScope(node.children, node.dataPath, node, inItems)
    if (node.role !== 'array') {
      report('invalid_shape', at, `"${dot}" holds no fields, so it takes no "items"`)
      return undefined
    }
    // The field of a list of single values has no name: its value is the item itself.
    if (node.children.some((child) => child.role !== 'display' && child.field.name === undefined)) {
      const message = `"${dot}" is a list of single values, so it takes no "items"`
      report('invalid_shape', at, message)
      return undefined
    }
    return createScope(node.children, [...node.dataPath, '*'], node, true)
  }

  /** A section or a row, which hold items. The items of a row each get their span. */
  function checkBlock(
    raw: Record<string, unknown>,
    path: DefinitionPath,
    scope: Scope,
    span: number,
    kind: 'section' | 'row',
  ): Item {
    const section = kind === 'section'
    const keys = section ? ['label', 'description'] : []
    const known = ['type', 'id', ...keys, 'items', 'ui', 'span', ...(section ? extensionKeys : [])]
    checkKeys(raw, known, path, `a ${kind}`)
    checkId(raw, path)
    checkText(raw, keys, path)
    checkUi(raw, path)
    return { kind, json: raw as never, path, list: checkItems(raw, path, scope, !section), span }
  }

  function checkSlot(
    raw: Record<string, unknown>,
    path: DefinitionPath,
    scope: Scope,
    span: number,
  ): Item | undefined {
    checkKeys(raw, ['type', 'name', 'span'], path, 'a slot')
    const name = raw['name']
    if (typeof name !== 'string' || !name) {
      report('invalid_shape', [...path, 'name'], 'A slot needs a "name"')
      return undefined
    }
    if (scope.inItems) {
      const message = 'A slot is filled once, so it goes outside the items of a list'
      report('invalid_shape', path, message)
      return undefined
    }
    return { kind: 'slot', name, span }
  }

  /** A display element written in the layout, like a heading, checked like one in `fields`. */
  function checkDisplay(
    raw: Record<string, unknown>,
    path: DefinitionPath,
    scope: Scope,
    span: number,
  ): Item | undefined {
    const typeName = raw['type']
    if (typeof typeName !== 'string') {
      const message = 'A layout item object needs a "field", or a "type"'
      report('invalid_shape', path, message)
      return undefined
    }
    const type = lookup(registry.fieldTypes, typeName)
    if (!type) {
      const message = `Unknown type "${typeName}". A layout item is a "section", a "row", a "slot" or a display element`
      report('unknown_type', [...path, 'type'], message)
      return undefined
    }
    if (type.kind !== 'none') {
      const message = `Type "${typeName}" has a value: add the field to "fields", and place it here by its name`
      report('invalid_shape', [...path, 'type'], message)
      return undefined
    }
    if (Object.hasOwn(raw, 'name')) {
      const message = `A "${typeName}" in the layout has no "name". Give it an "id"`
      report('unknown_key', [...path, 'name'], message)
    }
    checkId(raw, path)
    // Like a field in a list of fields, which doesn't need a name.
    checkField(omit(raw, ['id', 'span', 'name']), path, registry, new Set(), issues)
    const node: FieldNode = {
      field: raw as JsonField,
      type: typeName,
      role: 'display',
      kind: 'none',
      itemKind: undefined,
      dataPath: scope.dataPath,
      definitionPath: path,
      children: [],
    }
    return { kind: 'display', node, span }
  }

  /**
   * The field at `ref`, a dot path from the scope. A field of an array's items has no index
   * outside its item, so it can't be reached: the array is placed instead, with its `items`.
   */
  function resolve(ref: string, at: DefinitionPath, scope: Scope): FieldNode | undefined {
    if (!scope.nodes) return undefined
    let nodes = scope.nodes
    let node: FieldNode | undefined
    for (const key of ref.split('.')) {
      if (node?.role === 'array') {
        const dot = dotOf(node)
        const message = `"${ref}" is in the items of "${dot}", which have no index here. Place "${dot}", and lay out its items with "items"`
        report('unknown_field', at, message)
        return undefined
      }
      nodes = node ? node.children : nodes
      node = nodes.find((child) => child.role !== 'display' && child.field.name === key)
      if (!node) {
        const inside = scope.container ? ` in "${dotOf(scope.container)}"` : ''
        report('unknown_field', at, `Unknown field "${ref}"${inside}`)
        return undefined
      }
    }
    return node
  }

  /** Places a field once. Placing a group places every field inside it. */
  function place(node: FieldNode, at: DefinitionPath, scope: Scope): boolean {
    const groups: FieldNode[] = []
    for (let group = scope.parents.get(node); group; group = scope.parents.get(group)) {
      groups.push(group)
    }
    const dot = dotOf(node)
    const placedGroup = groups.find((group) => scope.placed.has(group))
    let message: string | undefined
    if (scope.placed.has(node)) {
      message = `Field "${dot}" is placed twice`
    } else if (placedGroup) {
      message = `Field "${dot}" is placed already, with "${dotOf(placedGroup)}"`
    } else if (scope.holding.has(node)) {
      message = `Field "${dot}" holds fields that are placed already`
    }
    if (message) {
      report('duplicate_placement', at, message)
      return false
    }
    scope.placed.add(node)
    for (const group of groups) scope.holding.add(group)
    return true
  }

  /**
   * Adds an issue on `path` for each field of the scope that is placed nowhere, unless `"*"`
   * places the rest, or a list of the scope's items is too malformed to tell.
   */
  function checkPlaced(scope: Scope, path: DefinitionPath): void {
    if (scope.rest || scope.broken || !scope.nodes) return
    const unplaced = (nodes: readonly FieldNode[]): FieldNode[] =>
      nodes.flatMap((node) => {
        if (scope.placed.has(node)) return []
        return scope.holding.has(node) ? unplaced(node.children) : [node]
      })
    for (const node of unplaced(scope.nodes)) {
      // Every field the compiler walked has its definition path.
      const where = definitionPaths.get(node.field) as DefinitionPath
      const message =
        node.role === 'display'
          ? `The "${node.type}" at ${formatPath(where)} isn't placed. Add "*", or write it in the layout`
          : `Field "${dotOf(node)}" isn't placed. Place it, or add "*" for the fields you don't list`
      report('unplaced_field', path, message)
    }
  }

  /** The layout of the checked items, with `"*"` replaced by the fields it places. */
  function build(list: readonly Item[]): LayoutNode[] {
    return keyed(
      list.flatMap((item): Unkeyed[] => {
        switch (item.kind) {
          case 'rest':
            // The layout is built only from resolved scopes.
            return restOf(item.scope.nodes as FieldNode[], item.scope)
          case 'field': {
            const { node, span, items } = item
            const children = items ? build(items.list) : keyed(node.children.map(fullLayout))
            return [{ type: 'field', node, span, children }]
          }
          case 'section': {
            const { json: section, path: definitionPath, span } = item
            return [{ type: 'section', section, definitionPath, span, children: build(item.list) }]
          }
          case 'row': {
            const { json: row, path: definitionPath, span } = item
            return [{ type: 'row', row, definitionPath, span, children: build(item.list) }]
          }
          case 'slot':
            return [{ type: 'slot', name: item.name, span: item.span }]
          case 'display':
            return [{ type: 'field', node: item.node, span: item.span, children: [] }]
        }
      }),
    )
  }

  /**
   * The fields of `nodes` placed nowhere in the scope, in the order of the definition. A group
   * with a field placed elsewhere comes with the rest of its fields, or not at all.
   */
  function restOf(nodes: readonly FieldNode[], scope: Scope): Unkeyed[] {
    return nodes.flatMap((node): Unkeyed[] => {
      if (scope.placed.has(node)) return []
      if (!scope.holding.has(node)) return [fullLayout(node)]
      const children = restOf(node.children, scope)
      return children.length
        ? [{ type: 'field', node, span: ROW_COLUMNS, children: keyed(children) }]
        : []
    })
  }

  function report(code: DefinitionIssue['code'], path: DefinitionPath, message: string): void {
    issues.push(issue(code, path, message))
  }

  function checkKeys(
    raw: Record<string, unknown>,
    known: readonly string[],
    path: DefinitionPath,
    what: string,
  ): void {
    for (const key of Object.keys(raw)) {
      if (!known.includes(key)) {
        report('unknown_key', [...path, key], `Unknown key "${key}" on ${what}`)
      }
    }
  }

  function checkId(raw: Record<string, unknown>, path: DefinitionPath): void {
    if (!Object.hasOwn(raw, 'id')) return
    const id = raw['id']
    const at = [...path, 'id']
    if (typeof id !== 'string' || !id) {
      report('invalid_shape', at, '"id" is a string that is not empty')
      return
    }
    const first = ids.get(id)
    if (first) {
      const message = `Duplicate id "${id}". The first one is at ${formatPath(first)}`
      report('duplicate_id', at, message)
      return
    }
    ids.set(id, path)
  }

  function checkText(
    raw: Record<string, unknown>,
    keys: readonly string[],
    path: DefinitionPath,
  ): void {
    for (const key of keys) {
      if (Object.hasOwn(raw, key) && typeof raw[key] !== 'string') {
        report('invalid_shape', [...path, key], `"${key}" is a string`)
      }
    }
  }

  function checkUi(raw: Record<string, unknown>, path: DefinitionPath): void {
    if (Object.hasOwn(raw, 'ui') && !isObject(raw['ui'])) {
      report('invalid_shape', [...path, 'ui'], '"ui" is an object')
    }
  }
}

function createScope(
  nodes: readonly FieldNode[] | undefined,
  dataPath: readonly (string | number)[],
  container: FieldNode | undefined,
  inItems: boolean,
): Scope {
  const parents = new Map<FieldNode, FieldNode>()
  const addParents = (list: readonly FieldNode[]) => {
    for (const node of list) {
      if (node.role !== 'group') continue
      for (const child of node.children) parents.set(child, node)
      addParents(node.children)
    }
  }
  addParents(nodes ?? [])
  const placed = new Set<FieldNode>()
  const holding = new Set<FieldNode>()
  return {
    nodes,
    dataPath,
    container,
    inItems,
    parents,
    placed,
    holding,
    rest: undefined,
    broken: false,
  }
}

function stepOf(
  step: JsonLayoutStep,
  definitionPath: DefinitionPath,
  children: LayoutNode[],
): LayoutStep {
  return { step, definitionPath, children, fields: fieldsOf(children) }
}

/** The fields with a value in `nodes`, in layout order, a container before its fields. */
function fieldsOf(nodes: readonly LayoutNode[]): FieldNode[] {
  return nodes.flatMap((node) => {
    if (node.type === 'slot') return []
    const own = node.type === 'field' && node.node.role !== 'display' ? [node.node] : []
    return [...own, ...fieldsOf(node.children)]
  })
}

/** A field with every field inside it, in the order of the definition. */
function fullLayout(node: FieldNode): Unkeyed {
  return { type: 'field', node, span: ROW_COLUMNS, children: keyed(node.children.map(fullLayout)) }
}

const keyed = (nodes: readonly Unkeyed[]): LayoutNode[] =>
  nodes.map((node, i) => ({ ...node, key: String(i) }) as LayoutNode)

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSpan = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= ROW_COLUMNS

const dotOf = (node: FieldNode) => node.dataPath.join('.')

function omit(raw: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(raw).filter(([key]) => !keys.includes(key)))
}
