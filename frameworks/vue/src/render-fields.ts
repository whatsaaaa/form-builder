import { type Component, h, type VNode } from 'vue'
import { ArrayField } from './array-field'
import type { FieldComponents, FieldPath } from './field-components'
import type { FieldNode } from './field-tree'
import type { AnyJsonFormInstance } from './use-json-form'
import { ValueField } from './value-field'

/** What `<JsonFields>` and `<JsonField>` render with. */
export interface RenderContext {
  of: AnyJsonFormInstance
  components: FieldComponents
  /** True for a field that isn't rendered, and so neither are the fields inside it. */
  skip: (node: FieldNode) => boolean
}

/** The components from the props, or else the ones `useJsonForm` got. */
export function resolveComponents(
  components: FieldComponents | undefined,
  of: AnyJsonFormInstance,
): FieldComponents {
  const resolved = components ?? of.components
  if (!resolved) {
    throw new TypeError('No field components. Pass them to useJsonForm, or to the component.')
  }
  return resolved
}

/** Throws for the field types that would render without a component, naming each once. */
export function checkComponents(ctx: RenderContext, nodes: readonly FieldNode[]): void {
  const missing = new Set<string>()
  const visit = (node: FieldNode) => {
    if (ctx.skip(node)) return
    if (!Object.hasOwn(ctx.components, node.type)) missing.add(node.type)
    node.children.forEach(visit)
  }
  nodes.forEach(visit)
  if (!missing.size) return

  // A missing component is a mistake in the code, not in the definition, so it throws early.
  const names = [...missing].map((type) => `"${type}"`).join(', ')
  const [noun, pronoun] = missing.size > 1 ? ['types', 'them'] : ['type', 'it']
  throw new TypeError(
    `No component for the field ${noun} ${names}. Add ${pronoun} to the components.`,
  )
}

/** `indexes` are the indexes of the array items the fields are in, outermost first. */
export function renderFields(
  ctx: RenderContext,
  nodes: readonly FieldNode[],
  indexes: readonly number[],
): VNode[] {
  return nodes
    .filter((node) => !ctx.skip(node))
    .map((node, position) => renderField(ctx, node, indexes, position))
}

export function renderField(
  ctx: RenderContext,
  node: FieldNode,
  indexes: readonly number[],
  position: number,
): VNode {
  const component = ctx.components[node.type] as Component
  const path = toPath(node.dataPath, indexes)
  const key = node.field.name ?? `#${position}`
  switch (node.role) {
    case 'display':
      return h(component, { key, field: node.field })
    case 'group':
      return h(
        component,
        { key, field: node.field, path },
        { default: () => renderFields(ctx, node.children, indexes) },
      )
    case 'array':
      return h(ArrayField, {
        key,
        of: ctx.of,
        node,
        path,
        component,
        renderItem: (index: number) => renderFields(ctx, node.children, [...indexes, index]),
      })
    case 'value':
      return h(ValueField, { key, of: ctx.of, node, path, component })
  }
}

/** The field's data path, with each `'*'` replaced by the index of the item it is in. */
function toPath(dataPath: FieldNode['dataPath'], indexes: readonly number[]): FieldPath {
  let next = 0
  return dataPath.map((key) => (key === '*' ? (indexes[next++] ?? key) : key))
}
