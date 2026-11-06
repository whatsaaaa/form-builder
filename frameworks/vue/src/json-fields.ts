import { type Component, defineComponent, h, type PropType, type VNode } from 'vue'
import { ArrayField } from './array-field'
import type { FieldComponents, FieldPath } from './field-components'
import type { FieldNode } from './field-tree'
import type { JsonFormInstance } from './use-json-form'
import { ValueField } from './value-field'

/**
 * Renders the fields of a `useJsonForm` form with your components, one per field type. It renders
 * nothing of its own, so put it inside Formisch's `<Form>` with your own submit button.
 */
export const JsonFields = defineComponent({
  name: 'JsonFields',
  props: {
    /** What `useJsonForm` returned. */
    of: { type: Object as PropType<JsonFormInstance>, required: true },
    components: { type: Object as PropType<FieldComponents>, required: true },
  },
  setup(props) {
    // A missing component is a mistake in the code, not in the definition, so it throws early.
    const missing = missingTypes(props.of.fields, props.components)
    if (missing.length) {
      const names = missing.map((type) => `"${type}"`).join(', ')
      const [noun, pronoun] = missing.length > 1 ? ['types', 'them'] : ['type', 'it']
      throw new TypeError(
        `No component for the field ${noun} ${names}. Add ${pronoun} to the components of <JsonFields>.`,
      )
    }

    /** `indexes` are the indexes of the array items the fields are in, outermost first. */
    const renderFields = (nodes: readonly FieldNode[], indexes: readonly number[]): VNode[] =>
      nodes.map((node, position) => renderField(node, indexes, position))

    function renderField(node: FieldNode, indexes: readonly number[], position: number): VNode {
      const component = props.components[node.type] as Component
      const path = toPath(node.dataPath, indexes)
      const key = node.field.name ?? `#${position}`
      switch (node.role) {
        case 'display':
          return h(component, { key, field: node.field })
        case 'group':
          return h(
            component,
            { key, field: node.field, path },
            { default: () => renderFields(node.children, indexes) },
          )
        case 'array':
          return h(ArrayField, {
            key,
            of: props.of,
            node,
            path,
            component,
            renderItem: (index: number) => renderFields(node.children, [...indexes, index]),
          })
        case 'value':
          return h(ValueField, { key, of: props.of, node, path, component })
      }
    }

    return () => renderFields(props.of.fields, [])
  },
})

/** The field types in the tree that have no component, each once. */
function missingTypes(nodes: readonly FieldNode[], components: FieldComponents): string[] {
  const missing = new Set<string>()
  const visit = (node: FieldNode) => {
    if (!Object.hasOwn(components, node.type)) missing.add(node.type)
    node.children.forEach(visit)
  }
  nodes.forEach(visit)
  return [...missing]
}

/** The field's data path, with each `'*'` replaced by the index of the item it is in. */
function toPath(dataPath: FieldNode['dataPath'], indexes: readonly number[]): FieldPath {
  let next = 0
  return dataPath.map((key) => (key === '*' ? (indexes[next++] ?? key) : key))
}
