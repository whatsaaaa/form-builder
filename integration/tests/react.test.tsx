// The scenarios in @formisch/react with only the schema package, wired the way Formisch's README
// shows: each element spreads `field.props`, so Formisch reads its value. Formisch reads text,
// checkboxes, checkbox groups, selects and files from the element. A value the element can't hold,
// like a number or `false`, is set with `field.onChange`, the way a React app sets it.
import {
  focus,
  Form,
  type FormStore,
  getInput,
  insert,
  remove,
  setErrors,
  setInput,
  useField,
  useFieldArray,
  useForm,
  validate,
} from '@formisch/react'
import { affects } from '@whatsaaaa/form-builder-affects'
import {
  createSchemaBuilder,
  type FieldNode,
  fieldPathsOfStep,
  issuesOfStep,
  type JsonField,
  type JsonForm,
  type LayoutField,
  type LayoutNode,
  type LayoutStep,
  type SchemaBuilder,
  toFieldPath,
  type VisibilityState,
} from '@whatsaaaa/form-builder-schema'
import { act, type ChangeEvent, Fragment, type ReactNode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, onTestFinished } from 'vitest'
import { type RenderedForm, runScenarios } from './run-scenarios'

// Tells React that tests wrap their updates in act().
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Path = readonly (string | number)[]
type Option = { value: string | number | boolean; label: string }

// The affects extension: the schema skips hidden fields, and the view hides and clears them.
const builder: SchemaBuilder = createSchemaBuilder({ extensions: [affects()] })

/** The content of the layout's slots, by name. */
const slots: Record<string, ReactNode> = {
  shipping: <p data-slot="shipping">Ships in three days</p>,
  submit: (
    <button type="submit" data-slot="submit">
      Place order
    </button>
  ),
}

const optionsOf = (field: JsonField) => (field.options ?? []) as Option[]
const dotPath = (path: Path) => path.join('.')

const inputTypes: Record<string, string> = {
  number: 'number',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
}

interface LayoutProps {
  form: FormStore
  /** What the conditions hide now. The nodes are the ones it shows. */
  visibility: VisibilityState
  nodes: readonly LayoutNode[]
  /** The index of each array item the nodes are in, outermost first. */
  indexes: readonly number[]
}

function Layout(props: LayoutProps) {
  const { form, visibility, indexes } = props
  return props.nodes.map((node) => {
    switch (node.type) {
      case 'section':
        return (
          <fieldset key={node.key}>
            <Layout form={form} visibility={visibility} nodes={node.children} indexes={indexes} />
          </fieldset>
        )
      case 'row':
        return (
          <div key={node.key}>
            {node.children.map((cell) => (
              <div key={cell.key} data-span={cell.span}>
                <Layout form={form} visibility={visibility} nodes={[cell]} indexes={indexes} />
              </div>
            ))}
          </div>
        )
      case 'slot':
        return <Fragment key={node.key}>{slots[node.name]}</Fragment>
      case 'field':
        return (
          <Field key={node.key} form={form} visibility={visibility} node={node} indexes={indexes} />
        )
    }
  })
}

function Field(props: Omit<LayoutProps, 'nodes'> & { node: LayoutField }) {
  const { form, visibility, node, indexes } = props
  const path = toFieldPath(node.node.dataPath, indexes)
  switch (node.node.role) {
    case 'display':
      return <p>{String(node.node.field.text ?? '')}</p>
    case 'group':
      return (
        <fieldset>
          <Layout form={form} visibility={visibility} nodes={node.children} indexes={indexes} />
        </fieldset>
      )
    case 'array':
      return <List form={form} visibility={visibility} node={node} path={path} indexes={indexes} />
    case 'value':
      return <Value form={form} node={node.node} path={path} />
  }
}

function List(props: Omit<LayoutProps, 'nodes'> & { node: LayoutField; path: Path }) {
  const { form, visibility, node, path, indexes } = props
  // The path comes from the definition at runtime, so the schema's types can't check it.
  const list = useFieldArray(form, { path: path as never })
  const initialInput = () => builder.getItemInput(node.node.field) as never
  return (
    <fieldset>
      {list.items.map((item, index) => (
        <div key={item}>
          {/* Each item hides its own fields, by the fields of the item. */}
          <Layout
            form={form}
            visibility={visibility}
            nodes={visibility.shownNodes(node.children, [...indexes, index])}
            indexes={[...indexes, index]}
          />
          <button
            type="button"
            data-remove={`${dotPath(path)}.${index}`}
            onClick={() => remove(form, { path: path as never, at: index })}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        data-add={dotPath(path)}
        onClick={() => insert(form, { path: path as never, initialInput: initialInput() })}
      >
        Add
      </button>
      {list.errors && <small data-error={dotPath(path)}>{list.errors[0]}</small>}
    </fieldset>
  )
}

/** A number from a number input. A cleared one has no value. */
const toNumber = (text: string) => (text.trim() === '' ? undefined : Number(text))

function Value(props: { form: FormStore; node: FieldNode; path: Path }) {
  const { field, kind, itemKind } = props.node
  const f = useField(props.form, { path: props.path as never })
  const set = (value: unknown) => f.onChange(value as never)
  const options = optionsOf(field)
  // Formisch reads an option's value from the element, where it is always a string.
  const stringChoices = (kind === 'array' ? itemKind : kind) === 'string'
  const picked = Array.isArray(f.input) ? (f.input as unknown[]) : []
  let control: ReactNode

  if (field.type === 'checkbox') {
    control = <input {...f.props} type="checkbox" checked={f.input === true} />
  } else if (field.type === 'radio') {
    control = options.map((option) => (
      <label key={String(option.value)}>
        <input
          {...f.props}
          type="radio"
          value={String(option.value)}
          checked={f.input === option.value}
          onChange={stringChoices ? f.props.onChange : () => set(option.value)}
        />
        {option.label}
      </label>
    ))
  } else if (field.type === 'multiselect' && field.ui?.widget === 'checkboxes') {
    control = options.map((option) => (
      <label key={String(option.value)}>
        <input
          {...f.props}
          type="checkbox"
          value={String(option.value)}
          checked={picked.includes(option.value)}
          onChange={
            stringChoices
              ? f.props.onChange
              : (event) =>
                  set(
                    event.target.checked
                      ? [...picked, option.value]
                      : picked.filter((value) => value !== option.value),
                  )
          }
        />
        {option.label}
      </label>
    ))
  } else if ((field.type === 'select' || field.type === 'multiselect') && options.length) {
    const multiple = field.type === 'multiselect'
    const fromOptions = (event: ChangeEvent<HTMLSelectElement>) => {
      const values = [...event.target.selectedOptions].map(
        (element) => options[element.index - Number(!multiple)]?.value,
      )
      set(multiple ? values : values[0])
    }
    control = (
      <select
        {...f.props}
        multiple={multiple}
        value={multiple ? picked.map(String) : String(f.input ?? '')}
        onChange={stringChoices ? f.props.onChange : fromOptions}
      >
        {!multiple && <option value="">Choose…</option>}
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    )
  } else if (field.type === 'file') {
    control = <input {...f.props} type="file" multiple={field.multiple === true} />
  } else if (field.type === 'textarea') {
    control = <textarea {...f.props} value={(f.input as string | undefined) ?? ''} />
  } else {
    control = (
      <input
        {...f.props}
        type={inputTypes[field.type] ?? 'text'}
        value={(f.input as string | number | undefined) ?? ''}
        onChange={
          kind === 'number' ? (event) => set(toNumber(event.target.value)) : f.props.onChange
        }
      />
    )
  }

  return (
    <div>
      {control}
      {f.errors && <small data-error={dotPath(props.path)}>{f.errors[0]}</small>}
    </div>
  )
}

function JsonFormView(props: { json: JsonForm; onSubmit: (output: unknown) => void }) {
  const [{ steps, visibility: conditions, ...config }] = useState(() => ({
    schema: builder.build(props.json),
    initialInput: builder.getInitialInput(props.json),
    steps: builder.getLayout(props.json).steps,
    visibility: builder.getVisibility(props.json),
  }))
  const form = useForm(config)
  // Reading the input here renders the form again on each change. It is the same object until
  // what the conditions hide changes.
  const visibility = conditions.of(getInput(form))
  // The fields the conditions clear, set blank as soon as they are cleared.
  const { toClear } = visibility
  useEffect(() => {
    for (const { path, input } of toClear) setInput(form, { path, input } as never)
  }, [form, toClear])

  const [index, setIndex] = useState(0)
  const step = steps[index] as LayoutStep
  // A step whose fields are all hidden is skipped. The current one stays, while the user is on it.
  const shown = steps.flatMap((each, i) =>
    i === index || !visibility.isStepHidden(each) ? [i] : [],
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
    // That validation set errors on the next step's fields too, which nobody saw.
    if (after === undefined) return
    for (const path of fieldPathsOfStep(steps[after] as LayoutStep, getInput(form))) {
      setErrors(form, { path, errors: null } as never)
    }
    setIndex(after)
  }

  return (
    <Form of={form} onSubmit={props.onSubmit}>
      <Layout
        key={index}
        form={form as FormStore}
        visibility={visibility}
        nodes={visibility.shownNodes(step.children, [])}
        indexes={[]}
      />
      {before !== undefined && (
        <button type="button" data-back="" onClick={() => setIndex(before)}>
          Back
        </button>
      )}
      {after !== undefined && (
        <button type="button" data-next="" onClick={() => void next()}>
          Next
        </button>
      )}
    </Form>
  )
}

function render(json: JsonForm): RenderedForm {
  const root = document.createElement('div')
  document.body.append(root)
  const submitted: unknown[] = []
  const reactRoot = createRoot(root)
  act(() =>
    reactRoot.render(<JsonFormView json={json} onSubmit={(output) => submitted.push(output)} />),
  )
  onTestFinished(() => {
    act(() => reactRoot.unmount())
    root.remove()
  })

  return {
    root,
    submitted,
    async update(change) {
      // Formisch validates asynchronously.
      await act(async () => {
        change()
        await new Promise((resolve) => setTimeout(resolve))
      })
    },
  }
}

describe('the fixtures in @formisch/react, with field.props', () => {
  runScenarios(render)
})
