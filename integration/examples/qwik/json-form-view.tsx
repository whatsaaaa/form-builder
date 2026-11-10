import {
  focus,
  Form,
  type FormStore,
  getInput,
  insert,
  remove,
  setErrors,
  setInput,
  type SubmitHandler,
  useField,
  useFieldArray,
  useForm$,
  validate,
} from '@formisch/qwik'
import {
  $,
  component$,
  Fragment,
  type JSXOutput,
  type QRL,
  useSignal,
  useTask$,
} from '@qwik.dev/core'
import { affects } from '@whatsaaaa/form-builder-affects'
import {
  coerceInput,
  createSchemaBuilder,
  type FieldNode,
  fieldPathsOfStep,
  isRequired,
  issuesOfStep,
  type JsonForm,
  type BuiltSchema,
  type LayoutField,
  type LayoutNode,
  type LayoutStep,
  toFieldPath,
} from '@whatsaaaa/form-builder-schema'

// With affects, the fields' conditions hide them: the schema doesn't validate them, and the view
// leaves them out.
const builder = createSchemaBuilder({ extensions: [affects()] })

/** The content of the layout's slots, by name. */
type Slots = Record<string, JSXOutput>

interface JsonFormViewProps {
  json: JsonForm
  onSubmit$: QRL<SubmitHandler<BuiltSchema>>
  slots?: Slots
}

export const JsonFormView = component$<JsonFormViewProps>(({ json, onSubmit$, slots = {} }) => {
  // Formisch makes the schema again from this function wherever the form resumes.
  const form = useForm$(() => ({
    schema: builder.build(json),
    initialInput: builder.getInitialInput(json),
  }))
  const { steps } = builder.getLayout(json)
  // What the conditions hide for the input now. Reading the input renders the form again when it
  // changes. The state has functions, which Qwik can't pass to a component: the nodes it shows can.
  const visibility = builder.getVisibility(json).of(getInput(form))
  // The fields the conditions clear, set blank as soon as they are cleared.
  useTask$(({ track }) => {
    const { toClear } = track(() => builder.getVisibility(json).of(getInput(form)))
    for (const { path, input } of toClear) setInput(form, { path, input } as never)
  })
  const index = useSignal(0)
  const step = steps[index.value] as LayoutStep
  const { before, after } = around(json, form, index.value)

  // Next validates the whole form, and only the issues on this step's fields keep the user here.
  const next = $(async () => {
    const found = issuesOfStep(step, (await validate(form)).issues)
    if (found.length) {
      const first = found.find((issue) => issue.field.role === 'value')
      if (first) focus(form, { path: first.path as never })
      return
    }
    // A handler works it out from the form, not from what it was when the view rendered.
    const { after } = around(json, form, index.value)
    if (after === undefined) return
    // That validation set errors on the next step's fields too, which nobody saw.
    for (const path of fieldPathsOfStep(steps[after] as LayoutStep, getInput(form))) {
      setErrors(form, { path, errors: null } as never)
    }
    index.value = after
  })

  return (
    <Form of={form} onSubmit$={onSubmit$}>
      {/* Keyed by the step, so another step's fields don't take over this one's components. */}
      <Layout
        key={index.value}
        form={form}
        json={json}
        nodes={visibility.shownNodes(step.children, [])}
        indexes={[]}
        slots={slots}
      />
      {before !== undefined && (
        <button
          type="button"
          data-back=""
          onClick$={() => (index.value = around(json, form, index.value).before ?? index.value)}
        >
          Back
        </button>
      )}
      {after !== undefined ? (
        <button type="button" data-next="" onClick$={next}>
          Next
        </button>
      ) : (
        <button type="submit">Save</button>
      )}
    </Form>
  )
})

/**
 * The steps before and after the one at `index` that the user goes to: a step whose fields are
 * all hidden is skipped.
 */
function around(json: JsonForm, form: FormStore, index: number) {
  const { steps } = builder.getLayout(json)
  const visibility = builder.getVisibility(json).of(getInput(form))
  const shown = steps.flatMap((each, i) =>
    i === index || !visibility.isStepHidden(each) ? [i] : [],
  )
  return { before: shown[shown.indexOf(index) - 1], after: shown[shown.indexOf(index) + 1] }
}

interface LayoutProps {
  form: FormStore
  /** The definition, for the conditions of each item of an array. */
  json: JsonForm
  /** The nodes the conditions show. */
  nodes: readonly LayoutNode[]
  /** The index of each array item the nodes are in, outermost first. */
  indexes: readonly number[]
  slots: Slots
}

const Layout = component$<LayoutProps>(({ nodes, ...props }) => {
  return nodes.map((node) => {
    switch (node.type) {
      case 'section':
        return (
          <fieldset key={node.key}>
            <legend>{node.section.label}</legend>
            <Layout {...props} nodes={node.children} />
          </fieldset>
        )
      case 'row':
        // One line of a 12-column grid, where each cell takes its span.
        return (
          <div key={node.key} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
            {node.children.map((cell) => (
              <div key={cell.key} data-span={cell.span} style={{ gridColumn: `span ${cell.span}` }}>
                <Layout {...props} nodes={[cell]} />
              </div>
            ))}
          </div>
        )
      case 'slot':
        return <Fragment key={node.key}>{props.slots[node.name]}</Fragment>
      case 'field':
        return <Field key={node.key} {...props} node={node} />
    }
  })
})

/** A field by its role. A group and an array render their fields from the layout. */
const Field = component$<Omit<LayoutProps, 'nodes'> & { node: LayoutField }>(
  ({ node, ...props }) => {
    switch (node.node.role) {
      case 'display':
        return <Display node={node.node} />
      case 'group':
        return (
          <fieldset>
            <legend>{node.node.field.label ?? node.node.field.name}</legend>
            <Layout {...props} nodes={node.children} />
          </fieldset>
        )
      case 'array':
        return (
          <ArrayField form={props.form} json={props.json} node={node} indexes={props.indexes} />
        )
      case 'value':
        return <ValueField form={props.form} node={node.node} indexes={props.indexes} />
    }
  },
)

const Display = component$<{ node: FieldNode }>(({ node }) => {
  const text = String(node.field.text ?? '')
  if (node.type === 'heading') {
    const Heading = `h${Number(node.field.level ?? 2)}` as 'h2'
    return <Heading>{text}</Heading>
  }
  return node.type === 'paragraph' ? <p>{text}</p> : <hr />
})

/** A list: Formisch's field array, and the layout of each item. A slot never is in one. */
const ArrayField = component$<Omit<LayoutProps, 'nodes' | 'slots'> & { node: LayoutField }>(
  ({ form, json, node, indexes }) => {
    const { field, dataPath } = node.node
    const path = toFieldPath(dataPath, indexes)
    // The path comes from the definition at runtime, so Formisch's types can't check it.
    const array = useFieldArray(form, { path: path as never })
    // Each item hides its own fields, by the fields of the item.
    const visibility = builder.getVisibility(json).of(getInput(form))
    return (
      <fieldset>
        <legend>{field.label ?? field.name}</legend>
        {array.items.value.map((item, index) => (
          <div key={item}>
            <Layout
              form={form}
              json={json}
              nodes={visibility.shownNodes(node.children, [...indexes, index])}
              indexes={[...indexes, index]}
              slots={{}}
            />
            <button
              type="button"
              data-remove={`${path.join('.')}.${index}`}
              onClick$={() => remove(form, { path: path as never, at: index })}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          data-add={path.join('.')}
          onClick$={() =>
            insert(form, {
              path: path as never,
              initialInput: builder.getItemInput(field) as never,
            })
          }
        >
          Add
        </button>
        {array.errors.value && <small data-error={path.join('.')}>{array.errors.value[0]}</small>}
      </fieldset>
    )
  },
)

type Option = { value: string | number | boolean; label: string }

/** The `<input>` type of each field type that has one of its own. Any other type is text. */
const inputTypes: Record<string, string> = {
  email: 'email',
  password: 'password',
  url: 'url',
  tel: 'tel',
  number: 'number',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
}

const ValueField = component$<{ form: FormStore; node: FieldNode; indexes: readonly number[] }>(
  ({ form, node, indexes }) => {
    const path = toFieldPath(node.dataPath, indexes)
    const field = useField(form, { path: path as never })
    // Turns what the element gives into the field's value, e.g. '5' into 5 for a number.
    const set = $((input: unknown) => field.onInput(coerceInput(input, node) as never))
    const input = field.input.value as unknown
    const options = (node.field.options ?? []) as Option[]
    const picked = Array.isArray(input) ? (input as unknown[]) : []
    const label = (
      <span>
        {node.field.label ?? node.field.name}
        {isRequired(node.field) && ' *'}
      </span>
    )
    const error = field.errors.value && (
      <small data-error={path.join('.')}>{field.errors.value[0]}</small>
    )

    // Radio buttons and checkboxes set their option's own value, so 2 stays a number.
    if (
      node.type === 'radio' ||
      (node.type === 'multiselect' && node.field.ui?.widget === 'checkboxes')
    ) {
      const radio = node.type === 'radio'
      return (
        <fieldset>
          <legend>{label}</legend>
          {options.map((option) => (
            <label key={String(option.value)}>
              <input
                {...field.props}
                type={radio ? 'radio' : 'checkbox'}
                checked={radio ? input === option.value : picked.includes(option.value)}
                onInput$={(_, element) =>
                  set(
                    radio
                      ? option.value
                      : element.checked
                        ? [...picked, option.value]
                        : picked.filter((value) => value !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          ))}
          {error}
        </fieldset>
      )
    }

    let control: JSXOutput
    if (node.type === 'checkbox') {
      control = (
        <input
          {...field.props}
          type="checkbox"
          checked={input === true}
          onInput$={(_, element) => set(element.checked)}
        />
      )
    } else if (options.length) {
      // A select's value is the option's index, and the option sets its own value.
      const multiple = node.kind === 'array'
      control = (
        <select
          {...field.props}
          multiple={multiple}
          onInput$={(_, element) => {
            const values = [...element.selectedOptions].map(
              (option) => options[Number(option.value)]?.value,
            )
            return set(multiple ? values : values[0])
          }}
        >
          {!multiple && <option value={-1}>Choose…</option>}
          {options.map((option, i) => (
            <option
              key={i}
              value={i}
              selected={multiple ? picked.includes(option.value) : input === option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      )
    } else if (node.type === 'file') {
      // Never set a file input's value. It gives a FileList, which coerceInput reads.
      control = (
        <input
          {...field.props}
          type="file"
          multiple={node.kind === 'array'}
          accept={node.field.accept as string | undefined}
          onInput$={(_, element) => set(element.files)}
        />
      )
    } else if (node.type === 'textarea') {
      control = (
        <textarea
          {...field.props}
          value={(input as string | undefined) ?? ''}
          onInput$={(_, element) => set(element.value)}
        />
      )
    } else {
      control = (
        <input
          {...field.props}
          type={inputTypes[node.type] ?? 'text'}
          value={(input as string | number | undefined) ?? ''}
          placeholder={node.field.placeholder}
          onInput$={(_, element) => set(element.value)}
        />
      )
    }

    return (
      <label>
        {label}
        {control}
        {error}
      </label>
    )
  },
)
