// The scenarios through @whatsaaaa/form-builder-vue, with components written the way its guide
// shows: they call `setInput` with what the element gives, and choices come from the definition.
import { Form, getInput } from '@formisch/vue'
import { affects } from '@whatsaaaa/form-builder-affects'
import {
  createSchemaBuilder,
  defaultFieldTypes,
  type FieldTypeDef,
  type JsonField,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import {
  type ArrayFieldProps,
  type FieldComponents,
  type FieldPath,
  JsonFields,
  type LayoutComponents,
  type RowProps,
  type SectionProps,
  useJsonForm,
  type ValueFieldProps,
} from '@whatsaaaa/form-builder-vue'
import {
  type Component,
  createApp,
  defineComponent,
  h,
  mergeProps,
  nextTick,
  type PropType,
} from 'vue'
import { describe, onTestFinished } from 'vitest'
import { runInitialInputCases } from './initial-input-cases'
import { type RenderedForm, runScenarios } from './run-scenarios'

type Option = { value: string | number | boolean; label: string }

// The fixtures with conditions need the affects extension. The others render the same with it.
const builder = createSchemaBuilder({ extensions: [affects()] })

const optionsOf = (field: JsonField) => (field.options ?? []) as Option[]
const dotPath = (path: FieldPath) => path.join('.')
const target = (event: Event) => event.target as HTMLInputElement & HTMLSelectElement

const error = (path: FieldPath, errors: readonly string[] | null) =>
  errors && h('small', { 'data-error': dotPath(path) }, errors[0])

const inputTypes: Record<string, string> = {
  number: 'number',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
}

/** The element of a field with a value, by its type. */
function control(props: ValueFieldProps) {
  const { field, input, inputProps, setInput } = props
  const options = optionsOf(field)
  // A copy, because Vue types props as an index signature, which an interface doesn't have.
  const bind = (own: Record<string, unknown>) => mergeProps({ ...inputProps }, own)

  if (field.type === 'checkbox') {
    return h(
      'input',
      bind({
        type: 'checkbox',
        checked: input === true,
        onChange: (e: Event) => setInput(target(e).checked),
      }),
    )
  }
  if (
    field.type === 'radio' ||
    (field.type === 'multiselect' && field.ui?.widget === 'checkboxes')
  ) {
    const picked = Array.isArray(input) ? (input as unknown[]) : []
    const toggle = (option: Option, checked: boolean) =>
      setInput(
        checked ? [...picked, option.value] : picked.filter((value) => value !== option.value),
      )
    return options.map((option) =>
      h('label', { key: String(option.value) }, [
        field.type === 'radio'
          ? h(
              'input',
              bind({
                type: 'radio',
                checked: input === option.value,
                onChange: () => setInput(option.value),
              }),
            )
          : h(
              'input',
              bind({
                type: 'checkbox',
                checked: picked.includes(option.value),
                onChange: (e: Event) => toggle(option, target(e).checked),
              }),
            ),
        option.label,
      ]),
    )
  }
  if (field.type === 'multiselect') {
    const picked = Array.isArray(input) ? (input as unknown[]) : []
    return h(
      'select',
      bind({
        multiple: true,
        onChange: (e: Event) =>
          setInput([...target(e).selectedOptions].map((element) => options[element.index]?.value)),
      }),
      options.map((option) =>
        h('option', { selected: picked.includes(option.value) }, option.label),
      ),
    )
  }
  if (field.type === 'select' && options.length) {
    // Index 0 is "Choose…", so an option's index is one less.
    return h(
      'select',
      bind({ onChange: (e: Event) => setInput(options[target(e).selectedIndex - 1]?.value) }),
      [
        h('option', { selected: input === undefined }, 'Choose…'),
        ...options.map((option) => h('option', { selected: option.value === input }, option.label)),
      ],
    )
  }
  if (field.type === 'file') {
    return h(
      'input',
      bind({
        type: 'file',
        multiple: field.multiple === true,
        onChange: (e: Event) => setInput(target(e).files),
      }),
    )
  }
  return h(
    field.type === 'textarea' ? 'textarea' : 'input',
    bind({
      type: inputTypes[field.type] ?? 'text',
      value: input ?? '',
      onInput: (e: Event) => setInput(target(e).value),
    }),
  )
}

/** Runtime props for a component that takes every key of `T`. */
const propsOf = <T>(...keys: (keyof T & string)[]) =>
  Object.fromEntries(keys.map((key) => [key, { type: null, required: true }])) as unknown as {
    [K in keyof T]-?: { type: PropType<T[K]>; required: true }
  }

const ValueInput = defineComponent({
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
  setup: (props) => () => h('div', [control(props), error(props.path, props.errors)]),
})

const Group = defineComponent({
  setup:
    (_, { slots }) =>
    () =>
      h('fieldset', slots.default?.()),
})

const List = defineComponent({
  props: propsOf<ArrayFieldProps>('field', 'path', 'items', 'errors', 'add', 'remove', 'move'),
  setup:
    (props, { slots }) =>
    () =>
      h('fieldset', [
        ...props.items.map((item, index) =>
          h('div', { key: item }, [
            slots.default?.({ index }),
            h(
              'button',
              {
                type: 'button',
                'data-remove': `${dotPath(props.path)}.${index}`,
                onClick: () => props.remove(index),
              },
              'Remove',
            ),
          ]),
        ),
        h(
          'button',
          { type: 'button', 'data-add': dotPath(props.path), onClick: () => props.add() },
          'Add',
        ),
        error(props.path, props.errors),
      ]),
})

const Display = defineComponent({
  props: { field: { type: Object as PropType<JsonField>, required: true } },
  setup: (props) => () => h('p', String(props.field.text ?? '')),
})

const components: FieldComponents = Object.fromEntries(
  Object.entries<FieldTypeDef>(defaultFieldTypes).map(([type, def]): [string, Component] => {
    if (def.kind === 'none') return [type, Display]
    if (def.container) return [type, def.kind === 'array' ? List : Group]
    return [type, ValueInput]
  }),
)

const Section = defineComponent({
  props: propsOf<SectionProps>('section'),
  setup:
    (props, { slots }) =>
    () =>
      h('fieldset', [h('legend', props.section.label), slots.default?.()]),
})

const Row = defineComponent({
  props: propsOf<RowProps>('row', 'spans'),
  setup:
    (props, { slots }) =>
    () =>
      h(
        'div',
        { style: { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' } },
        props.spans.map((span, index) =>
          h('div', { key: index, 'data-span': span, style: { gridColumn: `span ${span}` } }, [
            slots.default?.({ index }),
          ]),
        ),
      ),
})

const layoutComponents: LayoutComponents = { section: Section, row: Row }

function render(json: JsonForm): RenderedForm {
  const root = document.createElement('div')
  document.body.append(root)
  const submitted: unknown[] = []
  const app = createApp(
    defineComponent({
      setup() {
        const jsonForm = useJsonForm(json, { builder, components, layoutComponents })
        const { steps } = jsonForm
        return () =>
          h(
            Form as Component,
            { of: jsonForm.form, onSubmit: (output: unknown) => submitted.push(output) },
            {
              default: () => [
                h(
                  JsonFields,
                  { of: jsonForm },
                  {
                    shipping: () => h('p', { 'data-slot': 'shipping' }, 'Ships in three days'),
                    submit: () =>
                      h('button', { type: 'submit', 'data-slot': 'submit' }, 'Place order'),
                  },
                ),
                steps.isFirst
                  ? null
                  : h('button', { type: 'button', 'data-back': '', onClick: steps.back }, 'Back'),
                steps.isLast
                  ? null
                  : h(
                      'button',
                      { type: 'button', 'data-next': '', onClick: () => void steps.next() },
                      'Next',
                    ),
              ],
            },
          )
      },
    }),
  )
  app.mount(root)
  onTestFinished(() => {
    app.unmount()
    root.remove()
  })

  return {
    root,
    submitted,
    async update(change) {
      change()
      // Formisch validates asynchronously, and Vue renders on the next tick.
      await new Promise((resolve) => setTimeout(resolve))
      await nextTick()
    },
  }
}

describe('the fixtures in @formisch/vue, through @whatsaaaa/form-builder-vue', () => {
  runScenarios(render)
})

describe('initialInput in @whatsaaaa/form-builder-vue', () => {
  runInitialInputCases((json, initialInput) => {
    let input: unknown
    const app = createApp({
      setup() {
        input = getInput(useJsonForm(json, { builder, initialInput } as never).form)
        return () => null
      },
    })
    app.mount(document.createElement('div'))
    app.unmount()
    return input
  })
})
