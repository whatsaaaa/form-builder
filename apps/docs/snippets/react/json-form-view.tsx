// #region renderer
import {
  focus,
  Form,
  type FormStore,
  getInput,
  insert,
  remove,
  setErrors,
  type SubmitHandler,
  useField,
  useFieldArray,
  useForm,
  validate,
} from '@formisch/react'
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
import { Fragment, type ReactNode, useState } from 'react'

// #region setup
const builder = createSchemaBuilder()

/** The content of the layout's slots, by name. */
type Slots = Record<string, ReactNode>

interface JsonFormViewProps {
  json: JsonForm
  onSubmit: SubmitHandler<BuiltSchema>
  slots?: Slots
}

export function JsonFormView({
  json,
  onSubmit,
  slots = {},
}: JsonFormViewProps) {
  // Formisch reads its config once, so read the definition once too.
  const [{ steps, ...config }] = useState(() => ({
    schema: builder.build(json),
    initialInput: builder.getInitialInput(json),
    steps: builder.getLayout(json).steps,
  }))
  const form = useForm(config)
  // #endregion setup
  const [index, setIndex] = useState(0)
  const step = steps[index] as LayoutStep

  // #region next
  // Next validates the whole form, and only the issues on this step's fields keep the user here.
  const next = async () => {
    const found = issuesOfStep(step, (await validate(form)).issues)
    if (found.length) {
      const first = found.find((issue) => issue.field.role === 'value')
      if (first) focus(form, { path: first.path as never })
      return
    }
    // That validation set errors on the next step's fields too, which nobody saw.
    for (const path of fieldPathsOfStep(
      steps[index + 1] as LayoutStep,
      getInput(form),
    )) {
      setErrors(form, { path, errors: null } as never)
    }
    setIndex(index + 1)
  }
  // #endregion next

  return (
    <Form of={form} onSubmit={onSubmit}>
      {/* Keyed by the step, so another step's fields don't take over this one's components. */}
      <Layout
        key={index}
        form={form}
        nodes={step.children}
        indexes={[]}
        slots={slots}
      />
      {index > 0 && (
        <button type="button" onClick={() => setIndex(index - 1)}>
          Back
        </button>
      )}
      {index < steps.length - 1 ? (
        <button type="button" onClick={next}>
          Next
        </button>
      ) : (
        <button type="submit">Save</button>
      )}
    </Form>
  )
}

interface LayoutProps {
  form: FormStore
  nodes: readonly LayoutNode[]
  /** The index of each array item the nodes are in, outermost first. */
  indexes: readonly number[]
  slots: Slots
}

// #region layout
function Layout({ form, nodes, indexes, slots }: LayoutProps) {
  return nodes.map((node) => {
    switch (node.type) {
      case 'section':
        return (
          <fieldset key={node.key}>
            <legend>{node.section.label}</legend>
            <Layout
              form={form}
              nodes={node.children}
              indexes={indexes}
              slots={slots}
            />
          </fieldset>
        )
      case 'row':
        // One line of a 12-column grid, where each cell takes its span.
        return (
          <div
            key={node.key}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
            }}
          >
            {node.children.map((cell) => (
              <div
                key={cell.key}
                style={{ gridColumn: `span ${cell.span}` }}
              >
                <Layout
                  form={form}
                  nodes={[cell]}
                  indexes={indexes}
                  slots={slots}
                />
              </div>
            ))}
          </div>
        )
      case 'slot':
        return <Fragment key={node.key}>{slots[node.name]}</Fragment>
      case 'field':
        return (
          <Field
            key={node.key}
            form={form}
            node={node}
            indexes={indexes}
            slots={slots}
          />
        )
    }
  })
}
// #endregion layout

/** A field by its role. A group and an array render their fields from the layout. */
function Field({
  form,
  node,
  indexes,
  slots,
}: Omit<LayoutProps, 'nodes'> & { node: LayoutField }) {
  switch (node.node.role) {
    case 'display':
      return <Display node={node.node} />
    case 'group':
      return (
        <fieldset>
          <legend>{node.node.field.label ?? node.node.field.name}</legend>
          <Layout
            form={form}
            nodes={node.children}
            indexes={indexes}
            slots={slots}
          />
        </fieldset>
      )
    case 'array':
      return <ArrayField form={form} node={node} indexes={indexes} />
    case 'value':
      return <ValueField form={form} node={node.node} indexes={indexes} />
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

interface FieldProps<TNode> {
  form: FormStore
  node: TNode
  indexes: readonly number[]
}

// #region array
/** A list: Formisch's field array, and the layout of each item. A slot never is in one. */
function ArrayField({ form, node, indexes }: FieldProps<LayoutField>) {
  const { field, dataPath } = node.node
  // The path comes from the definition at runtime, so Formisch's types can't check it.
  const path = toFieldPath(dataPath, indexes) as never
  const array = useFieldArray(form, { path })
  const add = () =>
    insert(form, {
      path,
      initialInput: builder.getItemInput(field) as never,
    })
  return (
    <fieldset>
      <legend>{field.label ?? field.name}</legend>
      {array.items.map((item, index) => (
        <div key={item}>
          <Layout
            form={form}
            nodes={node.children}
            indexes={[...indexes, index]}
            slots={{}}
          />
          <button
            type="button"
            onClick={() => remove(form, { path, at: index })}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={add}>
        Add
      </button>
      {array.errors && <small>{array.errors[0]}</small>}
    </fieldset>
  )
}
// #endregion array

// #region value
function ValueField({ form, node, indexes }: FieldProps<FieldNode>) {
  const store = useField(form, {
    path: toFieldPath(node.dataPath, indexes) as never,
  })
  // Turns what the element gives into the field's value, e.g. '5' into 5 for a number.
  const set = (input: unknown) =>
    store.onChange(coerceInput(input, node) as never)
  return (
    <label>
      <span>
        {node.field.label ?? node.field.name}
        {isRequired(node.field) && ' *'}
      </span>
      {/* One control for every type here. See "Controls" for the right one for each. */}
      <input
        {...store.props}
        type={node.kind === 'number' ? 'number' : 'text'}
        value={(store.input as string | number | undefined) ?? ''}
        placeholder={node.field.placeholder}
        onChange={(e) => set(e.target.value)}
      />
      {store.errors && <small>{store.errors[0]}</small>}
    </label>
  )
}
// #endregion value
// #endregion renderer
