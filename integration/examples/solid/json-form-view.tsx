import {
  createForm,
  Form,
  type FormStore,
  insert,
  remove,
  type SubmitHandler,
  useField,
  useFieldArray,
} from '@formisch/solid'
import {
  coerceInput,
  createSchemaBuilder,
  type FieldNode,
  isRequired,
  type JsonForm,
  type JsonFormSchema,
  toFieldPath,
} from '@whatsaaaa/form-builder-schema'
import { For, type JSX, Match, Show, Switch } from 'solid-js'
import { Dynamic } from 'solid-js/web'

const builder = createSchemaBuilder()

export function JsonFormView(props: { json: JsonForm; onSubmit: SubmitHandler<JsonFormSchema> }) {
  // A component runs once, so the definition is read once.
  const form = createForm({
    schema: builder.build(props.json),
    initialInput: builder.getInitialInput(props.json),
  })
  return (
    <Form of={form} onSubmit={(output) => props.onSubmit(output)}>
      <Fields form={form} nodes={builder.getFieldTree(props.json)} indexes={[]} />
      <button type="submit">Save</button>
    </Form>
  )
}

interface FieldsProps {
  form: FormStore
  nodes: readonly FieldNode[]
  /** The index of each array item the fields are in, outermost first. */
  indexes: readonly number[]
}

function Fields(props: FieldsProps) {
  return (
    <For each={props.nodes}>
      {(node) => (
        <Switch>
          <Match when={node.role === 'display'}>
            <Display node={node} />
          </Match>
          <Match when={node.role === 'group'}>
            <fieldset>
              <legend>{node.field.label ?? node.field.name}</legend>
              <Fields form={props.form} nodes={node.children} indexes={props.indexes} />
            </fieldset>
          </Match>
          <Match when={node.role === 'array'}>
            <ArrayField form={props.form} node={node} indexes={props.indexes} />
          </Match>
          <Match when={node.role === 'value'}>
            <ValueField form={props.form} node={node} indexes={props.indexes} />
          </Match>
        </Switch>
      )}
    </For>
  )
}

function Display(props: { node: FieldNode }) {
  const text = () => String(props.node.field.text ?? '')
  return (
    <Switch fallback={<hr />}>
      <Match when={props.node.type === 'heading'}>
        <Dynamic component={`h${Number(props.node.field.level ?? 2)}`}>{text()}</Dynamic>
      </Match>
      <Match when={props.node.type === 'paragraph'}>
        <p>{text()}</p>
      </Match>
    </Switch>
  )
}

interface FieldProps {
  form: FormStore
  node: FieldNode
  indexes: readonly number[]
}

function ArrayField(props: FieldProps) {
  // A getter, so the path follows the item when one before it is removed. It comes from the
  // definition at runtime, so Formisch's types can't check it.
  const path = () => toFieldPath(props.node.dataPath, props.indexes)
  const array = useFieldArray(props.form, () => ({ path: path() as never }))
  const add = () =>
    insert(props.form, {
      path: path() as never,
      initialInput: builder.getItemInput(props.node.field) as never,
    })
  return (
    <fieldset>
      <legend>{props.node.field.label ?? props.node.field.name}</legend>
      <For each={array.items}>
        {(_, index) => (
          <div>
            <Fields
              form={props.form}
              nodes={props.node.children}
              indexes={[...props.indexes, index()]}
            />
            <button
              type="button"
              data-remove={`${path().join('.')}.${index()}`}
              onClick={() => remove(props.form, { path: path() as never, at: index() })}
            >
              Remove
            </button>
          </div>
        )}
      </For>
      <button type="button" data-add={path().join('.')} onClick={add}>
        Add
      </button>
      <Show when={array.errors}>
        {(errors) => <small data-error={path().join('.')}>{errors()[0]}</small>}
      </Show>
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

function ValueField(props: FieldProps) {
  const path = () => toFieldPath(props.node.dataPath, props.indexes)
  const field = useField(props.form, () => ({ path: path() as never }))
  // Turns what the element gives into the field's value, e.g. '5' into 5 for a number.
  const set = (input: unknown) => field.onInput(coerceInput(input, props.node) as never)
  const input = () => field.input as unknown
  const picked = () => (Array.isArray(input()) ? (input() as unknown[]) : [])
  // A field keeps its type, so the control is picked once.
  const { field: json, type, kind } = props.node
  const options = (json.options ?? []) as Option[]
  const label = (
    <span>
      {json.label ?? json.name}
      {isRequired(json) && ' *'}
    </span>
  )
  const error = (
    <Show when={field.errors}>
      {(errors) => <small data-error={path().join('.')}>{errors()[0]}</small>}
    </Show>
  )

  // Radio buttons and checkboxes set their option's own value, so 2 stays a number.
  if (type === 'radio' || (type === 'multiselect' && json.ui?.widget === 'checkboxes')) {
    const radio = type === 'radio'
    return (
      <fieldset>
        <legend>{label}</legend>
        <For each={options}>
          {(option) => (
            <label>
              <input
                {...field.props}
                type={radio ? 'radio' : 'checkbox'}
                checked={radio ? input() === option.value : picked().includes(option.value)}
                onInput={(e) =>
                  set(
                    radio
                      ? option.value
                      : e.currentTarget.checked
                        ? [...picked(), option.value]
                        : picked().filter((value) => value !== option.value),
                  )
                }
              />
              {option.label}
            </label>
          )}
        </For>
        {error}
      </fieldset>
    )
  }

  let control: JSX.Element
  if (type === 'checkbox') {
    control = (
      <input
        {...field.props}
        type="checkbox"
        checked={input() === true}
        onInput={(e) => set(e.currentTarget.checked)}
      />
    )
  } else if (options.length) {
    // A select's value is the option's index, and the option sets its own value.
    const multiple = kind === 'array'
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
        <Show when={!multiple}>
          <option value={-1}>Choose…</option>
        </Show>
        <For each={options}>
          {(option, i) => (
            <option
              value={i()}
              selected={multiple ? picked().includes(option.value) : input() === option.value}
            >
              {option.label}
            </option>
          )}
        </For>
      </select>
    )
  } else if (type === 'file') {
    // Never set a file input's value. It gives a FileList, which coerceInput reads.
    control = (
      <input
        {...field.props}
        type="file"
        multiple={kind === 'array'}
        accept={json.accept as string | undefined}
        onInput={(e) => set(e.currentTarget.files)}
      />
    )
  } else if (type === 'textarea') {
    control = (
      <textarea
        {...field.props}
        value={(input() as string | undefined) ?? ''}
        onInput={(e) => set(e.currentTarget.value)}
      />
    )
  } else {
    control = (
      <input
        {...field.props}
        type={inputTypes[type] ?? 'text'}
        value={(input() as string | number | undefined) ?? ''}
        placeholder={json.placeholder}
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
