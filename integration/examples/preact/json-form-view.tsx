import {
  Form,
  type FormStore,
  insert,
  remove,
  type SubmitHandler,
  useField,
  useFieldArray,
  useForm,
} from '@formisch/preact'
import {
  coerceInput,
  createSchemaBuilder,
  type FieldNode,
  isRequired,
  type JsonForm,
  type JsonFormSchema,
  toFieldPath,
} from '@whatsaaaa/form-builder-schema'
import { useState } from 'preact/hooks'

const builder = createSchemaBuilder()

export function JsonFormView(props: { json: JsonForm; onSubmit: SubmitHandler<JsonFormSchema> }) {
  // Formisch reads its config once, so read the definition once too.
  const [{ fields, ...config }] = useState(() => ({
    schema: builder.build(props.json),
    initialInput: builder.getInitialInput(props.json),
    fields: builder.getFieldTree(props.json),
  }))
  const form = useForm(config)
  return (
    <Form of={form} onSubmit={props.onSubmit}>
      <Fields form={form} nodes={fields} indexes={[]} />
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

function Fields({ form, nodes, indexes }: FieldsProps) {
  return nodes.map((node, position) => {
    const key = node.field.name ?? `#${position}`
    switch (node.role) {
      case 'display':
        return <Display key={key} node={node} />
      case 'group':
        return (
          <fieldset key={key}>
            <legend>{node.field.label ?? node.field.name}</legend>
            <Fields form={form} nodes={node.children} indexes={indexes} />
          </fieldset>
        )
      case 'array':
        return <ArrayField key={key} form={form} node={node} indexes={indexes} />
      case 'value':
        return <ValueField key={key} form={form} node={node} indexes={indexes} />
    }
  })
}

function Display({ node }: { node: FieldNode }) {
  const text = String(node.field.text ?? '')
  if (node.type === 'heading') {
    const Heading = `h${Number(node.field.level ?? 2)}` as 'h2'
    return <Heading>{text}</Heading>
  }
  return node.type === 'paragraph' ? <p>{text}</p> : <hr />
}

interface FieldProps {
  form: FormStore
  node: FieldNode
  indexes: readonly number[]
}

function ArrayField({ form, node, indexes }: FieldProps) {
  const path = toFieldPath(node.dataPath, indexes)
  // The path comes from the definition at runtime, so Formisch's types can't check it.
  const array = useFieldArray(form, { path: path as never })
  const add = () =>
    insert(form, { path: path as never, initialInput: builder.getItemInput(node.field) as never })
  return (
    <fieldset>
      <legend>{node.field.label ?? node.field.name}</legend>
      {array.items.value.map((item, index) => (
        <div key={item}>
          <Fields form={form} nodes={node.children} indexes={[...indexes, index]} />
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

function ValueField({ form, node, indexes }: FieldProps) {
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
