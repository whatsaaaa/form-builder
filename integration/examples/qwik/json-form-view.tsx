import {
  Form,
  type FormStore,
  insert,
  remove,
  type SubmitHandler,
  useField,
  useFieldArray,
  useForm$,
} from '@formisch/qwik'
import { $, component$, type JSXOutput, type QRL } from '@qwik.dev/core'
import {
  coerceInput,
  createSchemaBuilder,
  type FieldNode,
  isRequired,
  type JsonForm,
  type JsonFormSchema,
  toFieldPath,
} from '@whatsaaaa/form-builder-schema'

const builder = createSchemaBuilder()

interface JsonFormViewProps {
  json: JsonForm
  onSubmit$: QRL<SubmitHandler<JsonFormSchema>>
}

export const JsonFormView = component$<JsonFormViewProps>(({ json, onSubmit$ }) => {
  // Formisch makes the schema again from this function wherever the form resumes.
  const form = useForm$(() => ({
    schema: builder.build(json),
    initialInput: builder.getInitialInput(json),
  }))
  return (
    <Form of={form} onSubmit$={onSubmit$}>
      <Fields form={form} nodes={builder.getFieldTree(json)} indexes={[]} />
      <button type="submit">Save</button>
    </Form>
  )
})

interface FieldsProps {
  form: FormStore
  nodes: readonly FieldNode[]
  /** The index of each array item the fields are in, outermost first. */
  indexes: readonly number[]
}

const Fields = component$<FieldsProps>(({ form, nodes, indexes }) => {
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
})

const Display = component$<{ node: FieldNode }>(({ node }) => {
  const text = String(node.field.text ?? '')
  if (node.type === 'heading') {
    const Heading = `h${Number(node.field.level ?? 2)}` as 'h2'
    return <Heading>{text}</Heading>
  }
  return node.type === 'paragraph' ? <p>{text}</p> : <hr />
})

interface FieldProps {
  form: FormStore
  node: FieldNode
  indexes: readonly number[]
}

const ArrayField = component$<FieldProps>(({ form, node, indexes }) => {
  const path = toFieldPath(node.dataPath, indexes)
  // The path comes from the definition at runtime, so Formisch's types can't check it.
  const array = useFieldArray(form, { path: path as never })
  return (
    <fieldset>
      <legend>{node.field.label ?? node.field.name}</legend>
      {array.items.value.map((item, index) => (
        <div key={item}>
          <Fields form={form} nodes={node.children} indexes={[...indexes, index]} />
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
            initialInput: builder.getItemInput(node.field) as never,
          })
        }
      >
        Add
      </button>
      {array.errors.value && <small data-error={path.join('.')}>{array.errors.value[0]}</small>}
    </fieldset>
  )
})

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

const ValueField = component$<FieldProps>(({ form, node, indexes }) => {
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
})
