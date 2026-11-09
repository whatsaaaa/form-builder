// The scenarios in @formisch/react with only the schema package, wired the way Formisch's README
// shows: each element spreads `field.props`, so Formisch reads its value. Formisch reads text,
// checkboxes, checkbox groups, selects and files from the element. A value the element can't hold,
// like a number or `false`, is set with `field.onChange`, the way a React app sets it.
import {
  Form,
  type FormStore,
  insert,
  remove,
  useField,
  useFieldArray,
  useForm,
} from '@formisch/react'
import {
  createSchemaBuilder,
  type JsonField,
  type JsonForm,
  type SchemaBuilder,
  type WalkedField,
} from '@whatsaaaa/form-builder-schema'
import { act, type ChangeEvent, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, onTestFinished } from 'vitest'
import { type RenderedForm, runScenarios } from './run-scenarios'

// Tells React that tests wrap their updates in act().
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Path = (string | number)[]
type Option = { value: string | number | boolean; label: string }

const builder: SchemaBuilder = createSchemaBuilder()

/** A field of the definition, with the fields of a group, or of one item of a list. */
interface Node {
  walked: WalkedField
  children: Node[]
}

/** The definition's fields as a tree, from `walkFields`, which gives each field its kind. */
function tree(json: JsonForm): Node[] {
  const roots: Node[] = []
  const lists: Node[][] = [roots]
  for (const walked of builder.walkFields(json)) {
    const node: Node = { walked, children: [] }
    lists.length = walked.depth + 1
    lists.at(-1)?.push(node)
    lists.push(node.children)
  }
  return roots
}

const optionsOf = (field: JsonField) => (field.options ?? []) as Option[]
const dotPath = (path: Path) => path.join('.')

const inputTypes: Record<string, string> = {
  number: 'number',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
}

function Fields(props: { form: FormStore; nodes: Node[]; path: Path }) {
  return props.nodes.map((node, i) => {
    const { field, kind, type } = node.walked
    if (kind === 'none') return <p key={i}>{String(field.text ?? '')}</p>
    // The field of a list of single values has no name: its value is the item itself.
    const path = field.name === undefined ? props.path : [...props.path, field.name]
    if (builder.fieldTypes[type]?.container) {
      return kind === 'array' ? (
        <List key={i} form={props.form} node={node} path={path} />
      ) : (
        <fieldset key={i}>
          <Fields form={props.form} nodes={node.children} path={path} />
        </fieldset>
      )
    }
    return <Value key={i} form={props.form} walked={node.walked} path={path} />
  })
}

/** A new item's input: the defaults of the item's fields, the way `getInitialInput` reads them. */
function newItem(list: Node): unknown {
  const fields = list.children.map((child) => child.walked.field)
  if (list.walked.field.of !== undefined) {
    return builder.getInitialInput({ version: '1', fields: [{ ...fields[0]!, name: 'item' }] }).item
  }
  return builder.getInitialInput({ version: '1', fields })
}

function List(props: { form: FormStore; node: Node; path: Path }) {
  const { form, node, path } = props
  // The path comes from the definition at runtime, so the schema's types can't check it.
  const list = useFieldArray(form, { path: path as never })
  return (
    <fieldset>
      {list.items.map((item, index) => (
        <div key={item}>
          <Fields form={form} nodes={node.children} path={[...path, index]} />
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
        onClick={() => insert(form, { path: path as never, initialInput: newItem(node) as never })}
      >
        Add
      </button>
      {list.errors && <small data-error={dotPath(path)}>{list.errors[0]}</small>}
    </fieldset>
  )
}

/** A number from a number input. A cleared one has no value. */
const toNumber = (text: string) => (text.trim() === '' ? undefined : Number(text))

function Value(props: { form: FormStore; walked: WalkedField; path: Path }) {
  const { field, kind, itemKind } = props.walked
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
  const form = useForm({
    schema: builder.build(props.json),
    initialInput: builder.getInitialInput(props.json),
  })
  return (
    <Form of={form} onSubmit={props.onSubmit}>
      <Fields form={form as FormStore} nodes={tree(props.json)} path={[]} />
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
