import { dotPathOf, type FieldNode, toFieldPath } from '@whatsaaaa/form-builder-schema'
import { type Component, h, type VNode } from 'vue'
import { ArrayField } from './array-field'
import type { FieldComponents } from './field-components'
import type { AnyJsonFormInstance } from './use-json-form'
import { ValueField } from './value-field'

/** What `<JsonFields>` and `<JsonField>` render with. */
export interface RenderContext {
  of: AnyJsonFormInstance
  components: FieldComponents
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

/** `indexes` are the indexes of the array items the fields are in, outermost first. */
export function renderFields(
  ctx: RenderContext,
  nodes: readonly FieldNode[],
  indexes: readonly number[],
): VNode[] {
  return nodes.map((node, position) => renderField(ctx, node, indexes, position))
}

export function renderField(
  ctx: RenderContext,
  node: FieldNode,
  indexes: readonly number[],
  position: number,
): VNode {
  const component = ctx.components[node.type] as Component
  const path = toFieldPath(node.dataPath, indexes)
  const key = dotPathOf(node) ?? `#${position}`
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
