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
  useForm,
  validate,
} from '@formisch/preact'
import { useComputed, useSignalEffect } from '@preact/signals'
import { affects } from '@whatsaaaa/form-builder-affects'
import {
  coerceInput,
  createSchemaBuilder,
  type FieldNode,
  fieldPathsOf,
  isRequired,
  issuesOfStep,
  type JsonForm,
  type JsonFormSchema,
  type LayoutField,
  type LayoutNode,
  type LayoutStep,
  toFieldPath,
  type VisibilityState,
} from '@whatsaaaa/form-builder-schema'
import { type ComponentChildren, Fragment } from 'preact'
import { useState } from 'preact/hooks'

// With affects, the fields' conditions hide them: the schema doesn't validate them, and the view
// leaves them out.
const builder = createSchemaBuilder({ extensions: [affects()] })

/** The content of the layout's slots, by name. */
type Slots = Record<string, ComponentChildren>

interface JsonFormViewProps {
  json: JsonForm
  onSubmit: SubmitHandler<JsonFormSchema>
  slots?: Slots
}

export function JsonFormView({ json, onSubmit, slots = {} }: JsonFormViewProps) {
  // Formisch reads its config once, so read the definition once too.
  const [{ steps, conditions, ...config }] = useState(() => ({
    schema: builder.build(json),
    initialInput: builder.getInitialInput(json),
    steps: builder.getLayout(json).steps,
    conditions: builder.getVisibility(json),
  }))
  const form = useForm(config)
  // What the conditions hide for the input now: the same object until that changes.
  const visibility = useComputed(() => conditions.of(getInput(form)))
  // The fields the conditions clear, set blank as soon as they are cleared.
  useSignalEffect(() => {
    for (const { path, input } of visibility.value.toClear) setInput(form, { path, input } as never)
  })
  const [index, setIndex] = useState(0)
  const step = steps[index] as LayoutStep
  // A step whose fields are all hidden is skipped. The current one stays, while the user is on it.
  const shown = steps.flatMap((each, i) =>
    i === index || !visibility.value.isStepHidden(each) ? [i] : [],
  )
  const before = shown[shown.indexOf(index) - 1]
  const after = shown[shown.indexOf(index) + 1]

  // Next validates the whole form, and only the issues on this step's fields keep the user here.
  const next = async () => {
    const found = issuesOfStep(step, (await validate(form)).issues)
    if (found.length) {
      const first = found.find((issue) => issue.field.role === 'value')
      if (first) focus(form, { path: first.path as never })
      return
    }
    if (after === undefined) return
    // That validation set errors on the next step's fields too, which nobody saw.
    for (const path of fieldPathsOf(steps[after] as LayoutStep, getInput(form))) {
      setErrors(form, { path, errors: null } as never)
    }
    setIndex(after)
  }

  return (
    <Form of={form} onSubmit={onSubmit}>
      {/* Keyed by the step, so another step's fields don't take over this one's components. */}
      <Layout
        key={index}
        form={form}
        visibility={visibility.value}
        nodes={visibility.value.shownNodes(step.children, [])}
        indexes={[]}
        slots={slots}
      />
      {before !== undefined && (
        <button type="button" data-back="" onClick={() => setIndex(before)}>
          Back
        </button>
      )}
      {after === undefined ? (
        <button type="submit">Save</button>
      ) : (
        <button type="button" data-next="" onClick={next}>
          Next
        </button>
      )}
    </Form>
  )
}

interface LayoutProps {
  form: FormStore
  /** What the conditions hide now. The nodes are the ones it shows. */
  visibility: VisibilityState
  nodes: readonly LayoutNode[]
  /** The index of each array item the nodes are in, outermost first. */
  indexes: readonly number[]
  slots: Slots
}

function Layout({ nodes, ...props }: LayoutProps) {
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
}

/** A field by its role. A group and an array render their fields from the layout. */
function Field({ node, ...props }: Omit<LayoutProps, 'nodes'> & { node: LayoutField }) {
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
      return <ArrayField {...props} node={node} />
    case 'value':
      return <ValueField form={props.form} node={node.node} indexes={props.indexes} />
  }
}

function Display({ node }: { node: FieldNode }) {
  const text = String(node.field.text ?? '')
  if (node.type === 'heading') {
    const Heading = `h${Number(node.field.level ?? 2)}` as 'h2'
    return <Heading>{text}</Heading>
  }
  return node.type === 'paragraph' ? <p>{text}</p> : <hr />
}

/** A list: Formisch's field array, and the layout of each item. A slot never is in one. */
function ArrayField({
  form,
  visibility,
  node,
  indexes,
}: Omit<LayoutProps, 'nodes' | 'slots'> & { node: LayoutField }) {
  const { field, dataPath } = node.node
  const path = toFieldPath(dataPath, indexes)
  // The path comes from the definition at runtime, so Formisch's types can't check it.
  const array = useFieldArray(form, { path: path as never })
  const add = () =>
    insert(form, { path: path as never, initialInput: builder.getItemInput(field) as never })
  return (
    <fieldset>
      <legend>{field.label ?? field.name}</legend>
      {array.items.value.map((item, index) => (
        <div key={item}>
          {/* Each item hides its own fields, by the fields of the item. */}
          <Layout
            form={form}
            visibility={visibility}
            nodes={visibility.shownNodes(node.children, [...indexes, index])}
            indexes={[...indexes, index]}
            slots={{}}
          />
          <button
            type="button"
            data-remove={`${path.join('.')}.${index}`}
            onClick={() => remove(form, { path: path as never, at: index })}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" data-add={path.join('.')} onClick={add}>
        Add
      </button>
      {array.errors.value && <small data-error={path.join('.')}>{array.errors.value[0]}</small>}
    </fieldset>
  )
}

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

function ValueField({
  form,
  node,
  indexes,
}: {
  form: FormStore
  node: FieldNode
  indexes: readonly number[]
}) {
  const path = toFieldPath(node.dataPath, indexes)
  const field = useField(form, { path: path as never })
  // Turns what the element gives into the field's value, e.g. '5' into 5 for a number.
  const set = (input: unknown) => field.onInput(coerceInput(input, node) as never)
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
              onInput={(e) =>
                set(
                  radio
                    ? option.value
                    : e.currentTarget.checked
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

  let control
  if (node.type === 'checkbox') {
    control = (
      <input
        {...field.props}
        type="checkbox"
        checked={input === true}
        onInput={(e) => set(e.currentTarget.checked)}
      />
    )
  } else if (options.length) {
    // A select's value is the option's index, and the option sets its own value.
    const multiple = node.kind === 'array'
    control = (
      <select
        {...field.props}
        multiple={multiple}
        onInput={(e) => {
          const values = [...e.currentTarget.selectedOptions].map(
            (element) => options[Number(element.value)]?.value,
          )
          set(multiple ? values : values[0])
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
        onInput={(e) => set(e.currentTarget.files)}
      />
    )
  } else if (node.type === 'textarea') {
    control = (
      <textarea
        {...field.props}
        value={(input as string | undefined) ?? ''}
        onInput={(e) => set(e.currentTarget.value)}
      />
    )
  } else {
    control = (
      <input
        {...field.props}
        // Preact types each input type's attributes apart, so a type known at runtime is cast.
        type={(inputTypes[node.type] ?? 'text') as 'text'}
        value={(input as string | number | undefined) ?? ''}
        placeholder={node.field.placeholder}
        onInput={(e) => set(e.currentTarget.value)}
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
}
