import type {
  ArrayFieldProps,
  DisplayFieldProps,
  FieldComponents,
  GroupFieldProps,
  LayoutComponents,
  RowProps,
  SectionProps,
  ValueFieldProps,
} from '@whatsaaaa/form-builder-vue'
import { defaultFieldTypes, type FieldTypeDef } from '@whatsaaaa/form-builder-schema'
import { defineComponent, h, type PropType } from 'vue'

/** Runtime props for every key of `T`. The tests check what the components get, not Vue. */
function propsOf<T>(...keys: (keyof T & string)[]) {
  return Object.fromEntries(
    keys.map((key) => [key, { type: null, required: true }]),
  ) as unknown as {
    [K in keyof T]-?: { type: PropType<T[K]>; required: true }
  }
}

/** The props each value field got last, by its path: `'lines.0.quantity'`. */
export const values = new Map<string, ValueFieldProps>()
/** The props each array got last, by its path. */
export const arrays = new Map<string, ArrayFieldProps>()

const id = (path: readonly (string | number)[]) => path.join('.')

/** A plain input for any value field. */
export const TestInput = defineComponent({
  props: propsOf<ValueFieldProps>(
    'field',
    'path',
    'kind',
    'required',
    'input',
    'errors',
    'inputProps',
    'setInput',
  ),
  setup(props) {
    return () => {
      values.set(id(props.path), { ...props })
      return h('div', { 'data-role': 'value', 'data-path': id(props.path) }, [
        h('input', {
          ...props.inputProps,
          value:
            typeof props.input === 'string' || typeof props.input === 'number' ? props.input : '',
          'aria-required': props.required,
          onInput: (event: Event) => props.setInput((event.target as HTMLInputElement).value),
        }),
        props.errors ? h('small', props.errors[0]) : null,
      ])
    }
  },
})

export const TestGroup = defineComponent({
  props: propsOf<GroupFieldProps>('field', 'path'),
  setup(props, { slots }) {
    return () =>
      h('fieldset', { 'data-role': 'group', 'data-path': id(props.path) }, slots.default?.())
  },
})

export const TestArray = defineComponent({
  props: propsOf<ArrayFieldProps>('field', 'path', 'items', 'errors', 'add', 'remove', 'move'),
  setup(props, { slots }) {
    return () => {
      arrays.set(id(props.path), { ...props })
      return h('section', { 'data-role': 'array', 'data-path': id(props.path) }, [
        ...props.items.map((item, index) =>
          h('div', { key: item, 'data-item': index }, slots.default?.({ index })),
        ),
        props.errors ? h('small', props.errors[0]) : null,
      ])
    }
  },
})

export const TestText = defineComponent({
  props: propsOf<DisplayFieldProps>('field'),
  setup(props) {
    return () => h('p', { 'data-role': 'display' }, String(props.field.text ?? props.field.type))
  },
})

/** A component for every built-in type, by the role the type has. */
export const builtInComponents: FieldComponents = Object.fromEntries(
  Object.entries<FieldTypeDef>(defaultFieldTypes).map(([type, def]) => {
    if (def.kind === 'none') return [type, TestText]
    if (def.container) return [type, def.kind === 'array' ? TestArray : TestGroup]
    return [type, TestInput]
  }),
)

/** The props each row got last, by its id. */
export const rows = new Map<string, RowProps>()

export const TestSection = defineComponent({
  props: propsOf<SectionProps>('section'),
  setup(props, { slots }) {
    return () =>
      h('fieldset', { 'data-section': props.section.id ?? '' }, [
        h('legend', props.section.label),
        slots.default?.(),
      ])
  },
})

/** Each cell is a `<div>` with its span, like a CSS grid of 12 columns would take it. */
export const TestRow = defineComponent({
  props: propsOf<RowProps>('row', 'spans'),
  setup(props, { slots }) {
    return () => {
      rows.set(props.row.id ?? '', { ...props })
      return h(
        'div',
        { 'data-row': props.row.id ?? '' },
        props.spans.map((span, index) =>
          h('div', { key: index, 'data-span': span }, slots.default?.({ index })),
        ),
      )
    }
  },
})

export const layoutComponents: LayoutComponents = { section: TestSection, row: TestRow }
