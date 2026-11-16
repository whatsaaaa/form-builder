// The scenarios through @whatsaaaa/form-builder-react, with components written the way its guide
// shows: they call `setInput` with what the element gives, and choices come from the definition.
import { focus, Form, type FormStore, getInput, setErrors } from '@formisch/react'
import { affects } from '@whatsaaaa/form-builder-affects'
import { fills, type FillSource } from '@whatsaaaa/form-builder-fills'
import {
  createSchemaBuilder,
  defaultFieldTypes,
  type FieldTypeDef,
  type FillResult,
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
import { act, type ReactNode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, onTestFinished } from 'vitest'
import profileSource from '../../fixtures/fills/profile-source.json'
import { runFillsInitialInputCases, runFillsScenarios } from './fills-cases'
import { runInitialInputCases } from './initial-input-cases'
import { controlAt, type RenderedForm, runScenarios } from './run-scenarios'
import { runServerErrorsCases, type ServerIssue } from './server-errors-cases'

// Tells React that tests wrap their updates in act().
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Option = { value: string | number | boolean; label: string }

/** The calls of the `profiles` source, each waiting for the test to answer it. */
const profileCalls: {
  value: unknown
  answer: (values: FillResult | PromiseLike<FillResult>) => void
}[] = []
const profiles: FillSource = (value) =>
  new Promise<FillResult>((answer) => profileCalls.push({ value, answer }))

// The fixtures with conditions need the affects extension, and the forms with fills the fills
// extension, with the sources they name. The others render the same with them.
const builder = createSchemaBuilder({
  extensions: [
    affects(),
    fills({
      sources: {
        profiles,
        cities: () => null,
      },
    }),
  ],
})

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

/**
 * What an app does when its server rejects the input: once the answer is there, each field gets
 * its message with Formisch's `setErrors`, and the first one the focus.
 */
async function showServerIssues(form: FormStore, issues: readonly ServerIssue[]) {
  await new Promise((resolve) => setTimeout(resolve))
  // The paths are data, so the schema's types can't check them.
  for (const { path, message } of issues) setErrors(form, { path, errors: [message] } as never)
  focus(form, { path: issues[0]?.path as never })
}

function JsonFormView(props: {
  json: JsonForm
  rejects: readonly ServerIssue[]
  onSubmit: (output: unknown) => void
}) {
  const jsonForm = useJsonForm(props.json, { builder, components, layoutComponents })
  const { form, steps } = jsonForm
  const { rejects, onSubmit } = props
  return (
    <Form
      of={form}
      onSubmit={(output) => (rejects.length ? showServerIssues(form, rejects) : onSubmit(output))}
    >
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

function render(json: JsonForm, rejects: readonly ServerIssue[] = []): RenderedForm {
  const root = document.createElement('div')
  document.body.append(root)
  const submitted: unknown[] = []
  const reactRoot = createRoot(root)
  act(() =>
    reactRoot.render(
      <JsonFormView json={json} rejects={rejects} onSubmit={(output) => submitted.push(output)} />,
    ),
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

describe("a server's errors in a form with steps, in @whatsaaaa/form-builder-react", () => {
  runServerErrorsCases(render)
})

/** The input a form starts with in @whatsaaaa/form-builder-react, for the `initialInput`. */
function startInput(json: JsonForm, initialInput: unknown): unknown {
  const start: { input?: unknown } = {}
  function Start() {
    const { form } = useJsonForm(json, { builder, initialInput } as never)
    useEffect(() => {
      start.input = getInput(form)
    })
    return null
  }
  const root = createRoot(document.createElement('div'))
  act(() => root.render(<Start />))
  act(() => root.unmount())
  return start.input
}

describe('initialInput in @whatsaaaa/form-builder-react', () => {
  runInitialInputCases(startInput)
})

describe('fills in @whatsaaaa/form-builder-react', () => {
  runFillsScenarios(render)
  runFillsInitialInputCases(startInput)
})

/**
 * A form with fills the way the guide shows it: the submit button is disabled while a fill waits,
 * and the app shows the error of a fill.
 */
function FillsView(props: { json: JsonForm }) {
  const [fillError, setFillError] = useState<string>()
  const jsonForm = useJsonForm(props.json, {
    builder,
    components,
    onFillError: () => setFillError("Couldn't load the profile. Fill in the fields yourself."),
  })
  return (
    <Form of={jsonForm.form} onSubmit={() => {}}>
      <JsonFields of={jsonForm} />
      {fillError && <p role="alert">{fillError}</p>}
      <button type="submit" disabled={jsonForm.fills.pending.length > 0}>
        Save
      </button>
    </Form>
  )
}

describe('fills with a source in @whatsaaaa/form-builder-react', () => {
  function renderFills(json: unknown) {
    const root = document.createElement('div')
    document.body.append(root)
    const reactRoot = createRoot(root)
    act(() => reactRoot.render(<FillsView json={json as JsonForm} />))
    onTestFinished(() => {
      act(() => reactRoot.unmount())
      root.remove()
    })
    const element = <T extends Element>(selector: string) => root.querySelector(selector) as T
    return {
      names: () =>
        ['firstName', 'lastName', 'address.city'].map((path) => controlAt(root, path).value),
      saveDisabled: () => element<HTMLButtonElement>('button[type="submit"]').disabled,
      alert: () => root.querySelector('[role="alert"]')?.textContent ?? null,
      async update(change: () => void) {
        await act(async () => {
          change()
          await new Promise((resolve) => setTimeout(resolve))
        })
      },
      choose(label: string) {
        const select = controlAt(root, 'profile') as HTMLSelectElement
        for (const option of select.options) option.selected = option.text === label
        select.dispatchEvent(new Event('change', { bubbles: true }))
      },
    }
  }

  it('waits for a source with the submit disabled, then fills', async () => {
    profileCalls.length = 0
    const form = renderFills(profileSource)
    expect(form.saveDisabled()).toBe(false)
    await form.update(() => form.choose('Profile A'))
    expect(profileCalls.map(({ value }) => value)).toEqual(['a'])
    expect(form.saveDisabled()).toBe(true)

    await form.update(() =>
      profileCalls[0]?.answer({
        firstName: 'Marko',
        lastName: 'Petrović',
        'address.city': 'Beograd',
        id: 7,
      }),
    )
    expect(form.names()).toEqual(['Marko', 'Petrović', 'Beograd'])
    expect(form.saveDisabled()).toBe(false)
  })

  it('shows what the app makes of an error of a source', async () => {
    profileCalls.length = 0
    const form = renderFills(profileSource)
    await form.update(() => form.choose('Profile B'))
    await form.update(() => profileCalls[0]?.answer(Promise.reject(new Error('Down'))))
    expect(form.alert()).toBe("Couldn't load the profile. Fill in the fields yourself.")
    expect(form.names()).toEqual(['', '', ''])
    expect(form.saveDisabled()).toBe(false)
  })
})
