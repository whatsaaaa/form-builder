import { dotPathOf, type FieldNode, toFieldPath } from '@whatsaaaa/form-builder-schema'
import type { ComponentType, ReactElement, ReactNode } from 'react'
import { ArrayField } from './array-field'
import type {
  ArrayFieldProps,
  DisplayFieldProps,
  FieldComponents,
  GroupFieldProps,
  ValueFieldProps,
} from './field-components'
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
): ReactElement[] {
  return nodes.map((node, position) =>
    renderField(ctx, node, indexes, dotPathOf(node) ?? `#${position}`, (inner) =>
      renderFields(ctx, node.children, inner),
    ),
  )
}

/**
 * Renders one field with its component. `children` renders the fields inside a group, or inside
 * the item of an array, with the indexes of the items they are in.
 */
export function renderField(
  ctx: RenderContext,
  node: FieldNode,
  indexes: readonly number[],
  key: string,
  children: (indexes: readonly number[]) => ReactNode,
): ReactElement {
  // The fields were checked for components, and the role tells which props the component takes.
  const component = ctx.components[node.type]
  const path = toFieldPath(node.dataPath, indexes)
  switch (node.role) {
    case 'display': {
      const Display = component as ComponentType<DisplayFieldProps>
      return <Display key={key} field={node.field} />
    }
    case 'group': {
      const Group = component as ComponentType<GroupFieldProps>
      return (
        <Group key={key} field={node.field} path={path}>
          {children(indexes)}
        </Group>
      )
    }
    case 'array':
      return (
        <ArrayField
          key={key}
          of={ctx.of}
          node={node}
          path={path}
          component={component as ComponentType<ArrayFieldProps>}
          renderItem={(index) => children([...indexes, index])}
        />
      )
    case 'value':
      return (
        <ValueField
          key={key}
          of={ctx.of}
          node={node}
          path={path}
          component={component as ComponentType<ValueFieldProps>}
        />
      )
  }
}
