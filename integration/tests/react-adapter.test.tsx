// The scenarios through @whatsaaaa/form-builder-react, with components written the way its README
// shows: they call `setInput` with what the element gives, and choices come from the definition.
import { Form } from '@formisch/react'
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
  type DisplayFieldProps,
  type FieldComponents,
  type FieldPath,
  type GroupFieldProps,
  JsonFields,
  type LayoutComponents,
  type RowProps,
  type SectionProps,
  useJsonForm,
  type ValueFieldProps,
} from '@whatsaaaa/form-builder-react'
import { act, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, onTestFinished } from 'vitest'
import { type RenderedForm, runScenarios } from './run-scenarios'

// Tells React that tests wrap their updates in act().
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Option = { value: string | number | boolean; label: string }

// The fixtures with conditions need the affects extension. The others render the same with it.
const builder = createSchemaBuilder({ extensions: [affects()] })

const optionsOf = (field: JsonField) => (field.options ?? []) as Option[]
const dotPath = (path: FieldPath) => path.join('.')

function ErrorText(props: { path: FieldPath; errors: readonly string[] | null }) {
  return props.errors && <small data-error={dotPath(props.path)}>{props.errors[0]}</small>
}

const inputTypes: Record<string, string> = {
  number: 'number',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
}

/** The element of a field with a value, by its type. */
function Control({ field, input, inputProps, setInput }: ValueFieldProps): ReactNode {
  const options = optionsOf(field)
  const picked = Array.isArray(input) ? (input as unknown[]) : []
  // An option's index is its element's value, so `2` stays a number and `false` a boolean.
  const indexOf = (value: unknown) => String(options.findIndex((option) => option.value === value))

  if (field.type === 'checkbox') {
    return (
      <input
        {...inputProps}
        type="checkbox"
        checked={input === true}
        onChange={(e) => setInput(e.target.checked)}
      />
    )
  }
  if (field.type === 'radio') {
    return options.map((option) => (
      <label key={String(option.value)}>
        <input
          {...inputProps}
          type="radio"
          checked={input === option.value}
          onChange={() => setInput(option.value)}
        />
        {option.label}
      </label>
    ))
  }
  if (field.type === 'multiselect' && field.ui?.widget === 'checkboxes') {
    return options.map((option) => (
      <label key={String(option.value)}>
        <input
          {...inputProps}
          type="checkbox"
          checked={picked.includes(option.value)}
          onChange={(e) =>
            setInput(
              e.target.checked
                ? [...picked, option.value]
                : picked.filter((value) => value !== option.value),
            )
          }
        />
        {option.label}
      </label>
    ))
  }
  if (field.type === 'multiselect') {
    return (
      <select
        {...inputProps}
        multiple
        value={picked.map(indexOf)}
        onChange={(e) =>
          setInput([...e.target.selectedOptions].map((element) => options[element.index]?.value))
        }
      >
        {options.map((option, i) => (
          <option key={i} value={i}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === 'select' && options.length) {
    return (
      <select
        {...inputProps}
        value={indexOf(input)}
        onChange={(e) => setInput(options[Number(e.target.value)]?.value)}
      >
        <option value={-1}>Choose…</option>
        {options.map((option, i) => (
          <option key={i} value={i}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === 'file') {
    return (
      <input
        {...inputProps}
        type="file"
        multiple={field.multiple === true}
        onChange={(e) => setInput(e.target.files)}
      />
    )
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        {...inputProps}
        value={String(input ?? '')}
        onChange={(e) => setInput(e.target.value)}
      />
    )
  }
  return (
    <input
      {...inputProps}
      type={inputTypes[field.type] ?? 'text'}
      value={String(input ?? '')}
      onChange={(e) => setInput(e.target.value)}
    />
  )
}

function ValueInput(props: ValueFieldProps) {
  return (
    <div>
      <Control {...props} />
      <ErrorText path={props.path} errors={props.errors} />
    </div>
  )
}

function Group({ children }: GroupFieldProps) {
  return <fieldset>{children}</fieldset>
}

function List({ path, items, errors, add, remove, children }: ArrayFieldProps) {
  return (
    <fieldset>
      {items.map((item, index) => (
        <div key={item}>
          {children(index)}
          <button
            type="button"
            data-remove={`${dotPath(path)}.${index}`}
            onClick={() => remove(index)}
          >
            Remove
          </button>
        </div>
      ))}
      <button type="button" data-add={dotPath(path)} onClick={add}>
        Add
      </button>
      <ErrorText path={path} errors={errors} />
    </fieldset>
  )
}

function Display({ field }: DisplayFieldProps) {
  return <p>{String(field.text ?? '')}</p>
}

const components: FieldComponents = Object.fromEntries(
  Object.entries<FieldTypeDef>(defaultFieldTypes).map(([type, def]) => {
    if (def.kind === 'none') return [type, Display]
    if (def.container) return [type, def.kind === 'array' ? List : Group]
    return [type, ValueInput]
  }),
)

function Section({ section, children }: SectionProps) {
  return (
    <fieldset>
      <legend>{section.label}</legend>
      {children}
    </fieldset>
  )
}

function Row({ spans, children }: RowProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
      {spans.map((span, index) => (
        <div key={index} data-span={span} style={{ gridColumn: `span ${span}` }}>
          {children(index)}
        </div>
      ))}
    </div>
  )
}

const layoutComponents: LayoutComponents = { section: Section, row: Row }

const slots = {
  shipping: <p data-slot="shipping">Ships in three days</p>,
  submit: (
    <button type="submit" data-slot="submit">
      Place order
    </button>
  ),
}

function JsonFormView(props: { json: JsonForm; onSubmit: (output: unknown) => void }) {
  const jsonForm = useJsonForm(props.json, { builder, components, layoutComponents })
  const { steps } = jsonForm
  return (
    <Form of={jsonForm.form} onSubmit={props.onSubmit}>
      <JsonFields of={jsonForm} slots={slots} />
      {!steps.isFirst && (
        <button type="button" data-back="" onClick={steps.back}>
          Back
        </button>
      )}
      {!steps.isLast && (
        <button type="button" data-next="" onClick={() => void steps.next()}>
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

describe('the fixtures in @formisch/react, through @whatsaaaa/form-builder-react', () => {
  runScenarios(render)
})
