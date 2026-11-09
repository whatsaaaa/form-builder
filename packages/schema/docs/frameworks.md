<!-- The code blocks are the files in integration/examples, copied by `pnpm docs:gen`. Edit the files, not the blocks. -->

# Formisch in each framework

The schema package works with Formisch's own package for every framework, with no adapter from this repo. Here is a whole renderer for each of Preact, Solid, Svelte, Qwik and Angular. Each has the shape of the React one in [Using with Formisch](../README.md#using-with-formisch), with the native control of every built-in type from [Controls](../README.md#controls). For Vue and React, use [`@whatsaaaa/form-builder-vue`](https://github.com/whatsaaaa/form-builder/tree/main/frameworks/vue) and [`@whatsaaaa/form-builder-react`](https://github.com/whatsaaaa/form-builder/tree/main/frameworks/react).

Every renderer is tested. The [integration tests](https://github.com/whatsaaaa/form-builder/tree/main/integration/examples) run every shared fixture through it, from a text field to arrays, form rules and layouts with steps: they type, tick, pick, step and submit like a person, and check the fields on show, the errors the form shows and what it submits.

Each one renders the definition's [layout](../README.md#layout), so it renders a definition without one too, as one step with every field. Each one has the same parts:

- **`JsonFormView`** reads the definition once: the schema and initial input for Formisch's form, and the layout's steps. It renders the current step, Back and Next while there are steps, and Save on the last one. Next validates the whole form, and moves on only when `issuesOfStep` finds no issue on this step's fields, or focuses the first one. The step it moves to starts clean: `fieldPathsOf` gives its fields' paths, to clear the errors that validation set on them.
- **`Layout`** renders each node of a step by its `type`: a section as a `<fieldset>`, a row as a 12-column CSS grid whose cells take their `span`, a slot with the content passed in `slots`, and a field by its `role`. A group and an array render their fields from the layout's `children`, not the field's.
- **`ArrayField`** renders Formisch's field array, the layout of each item, and buttons to add and remove items. A new item's input is `builder.getItemInput(node.field)`.
- **`ValueField`** connects a field to Formisch at its path, from `toFieldPath(node.dataPath, indexes)`, picks the control by the field's type, and sets what the element gives through `coerceInput`.

The `data-error`, `data-add`, `data-remove`, `data-next`, `data-back` and `data-span` attributes only mark elements for the tests. Leave them out.

A row's CSS grid has 12 columns at every width here. On a narrow screen, give the cells the whole row with a media query, as the layout says nothing about screen sizes. The Vue and React adapters also restore a step's errors when the user comes back to it, revalidate a step that failed Next as the user fixes it, and treat a submit before the last step as Next: see their READMEs.

## Preact

```sh
pnpm add @whatsaaaa/form-builder-schema @formisch/preact @preact/signals preact valibot
```

- It is the React renderer with Preact's imports. A field's state is a signal: read `field.input.value` and `field.errors.value`.
- Set a value with `field.onInput(value)`. The element's own `onInput` replaces Formisch's, which would store the element's string.
- Preact types the attributes of each `<input>` type apart, so a type known only at runtime needs a cast.

<!-- example: preact/json-form-view.tsx -->

```tsx
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
} from '@formisch/preact'
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
} from '@whatsaaaa/form-builder-schema'
import { type ComponentChildren, Fragment } from 'preact'
import { useState } from 'preact/hooks'

const builder = createSchemaBuilder()

/** The content of the layout's slots, by name. */
type Slots = Record<string, ComponentChildren>

interface JsonFormViewProps {
  json: JsonForm
  onSubmit: SubmitHandler<JsonFormSchema>
  slots?: Slots
}

export function JsonFormView({ json, onSubmit, slots = {} }: JsonFormViewProps) {
  // Formisch reads its config once, so read the definition once too.
  const [{ steps, ...config }] = useState(() => ({
    schema: builder.build(json),
    initialInput: builder.getInitialInput(json),
    steps: builder.getLayout(json).steps,
  }))
  const form = useForm(config)
  const [index, setIndex] = useState(0)
  const step = steps[index] as LayoutStep
  const isLast = index === steps.length - 1

  // Next validates the whole form, and only the issues on this step's fields keep the user here.
  const next = async () => {
    const found = issuesOfStep(step, (await validate(form)).issues)
    if (found.length) {
      const first = found.find((issue) => issue.field.role === 'value')
      if (first) focus(form, { path: first.path as never })
      return
    }
    // That validation set errors on the next step's fields too, which nobody saw.
    for (const path of fieldPathsOf(steps[index + 1] as LayoutStep, getInput(form))) {
      setErrors(form, { path, errors: null } as never)
    }
    setIndex(index + 1)
  }

  return (
    <Form of={form} onSubmit={onSubmit}>
      {/* Keyed by the step, so another step's fields don't take over this one's components. */}
      <Layout key={index} form={form} nodes={step.children} indexes={[]} slots={slots} />
      {index > 0 && (
        <button type="button" data-back="" onClick={() => setIndex(index - 1)}>
          Back
        </button>
      )}
      {isLast ? (
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
  nodes: readonly LayoutNode[]
  /** The index of each array item the nodes are in, outermost first. */
  indexes: readonly number[]
  slots: Slots
}

function Layout({ form, nodes, indexes, slots }: LayoutProps) {
  return nodes.map((node) => {
    switch (node.type) {
      case 'section':
        return (
          <fieldset key={node.key}>
            <legend>{node.section.label}</legend>
            <Layout form={form} nodes={node.children} indexes={indexes} slots={slots} />
          </fieldset>
        )
      case 'row':
        // One line of a 12-column grid, where each cell takes its span.
        return (
          <div key={node.key} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
            {node.children.map((cell) => (
              <div key={cell.key} data-span={cell.span} style={{ gridColumn: `span ${cell.span}` }}>
                <Layout form={form} nodes={[cell]} indexes={indexes} slots={slots} />
              </div>
            ))}
          </div>
        )
      case 'slot':
        return <Fragment key={node.key}>{slots[node.name]}</Fragment>
      case 'field':
        return <Field key={node.key} form={form} node={node} indexes={indexes} slots={slots} />
    }
  })
}

/** A field by its role. A group and an array render their fields from the layout. */
function Field({ form, node, indexes, slots }: Omit<LayoutProps, 'nodes'> & { node: LayoutField }) {
  switch (node.node.role) {
    case 'display':
      return <Display node={node.node} />
    case 'group':
      return (
        <fieldset>
          <legend>{node.node.field.label ?? node.node.field.name}</legend>
          <Layout form={form} nodes={node.children} indexes={indexes} slots={slots} />
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

/** A list: Formisch's field array, and the layout of each item. A slot never is in one. */
function ArrayField({
  form,
  node,
  indexes,
}: {
  form: FormStore
  node: LayoutField
  indexes: readonly number[]
}) {
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
          <Layout form={form} nodes={node.children} indexes={[...indexes, index]} slots={{}} />
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
```

## Solid

```sh
pnpm add @whatsaaaa/form-builder-schema @formisch/solid solid-js valibot
```

- `createForm` makes the form. A component runs once, so it reads the definition once.
- Pass the path to `useField` and `useFieldArray` as a getter, so a field follows its item when one before it is removed.
- A field keeps its type, so the control is picked once, when the field renders. Its state is read in JSX, where Solid tracks it.

<!-- example: solid/json-form-view.tsx -->

```tsx
import {
  createForm,
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
  validate,
} from '@formisch/solid'
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
} from '@whatsaaaa/form-builder-schema'
import { createSignal, For, type JSX, Match, Show, Switch } from 'solid-js'
import { Dynamic } from 'solid-js/web'

const builder = createSchemaBuilder()

/** The content of the layout's slots, by name. */
type Slots = Record<string, JSX.Element>

interface JsonFormViewProps {
  json: JsonForm
  onSubmit: SubmitHandler<JsonFormSchema>
  slots?: Slots
}

export function JsonFormView(props: JsonFormViewProps) {
  // A component runs once, so the definition is read once.
  const form = createForm({
    schema: builder.build(props.json),
    initialInput: builder.getInitialInput(props.json),
  })
  const { steps } = builder.getLayout(props.json)
  const [index, setIndex] = createSignal(0)
  const step = () => steps[index()] as LayoutStep
  const isLast = () => index() === steps.length - 1

  // Next validates the whole form, and only the issues on this step's fields keep the user here.
  const next = async () => {
    const found = issuesOfStep(step(), (await validate(form)).issues)
    if (found.length) {
      const first = found.find((issue) => issue.field.role === 'value')
      if (first) focus(form, { path: first.path as never })
      return
    }
    // That validation set errors on the next step's fields too, which nobody saw.
    for (const path of fieldPathsOf(steps[index() + 1] as LayoutStep, getInput(form))) {
      setErrors(form, { path, errors: null } as never)
    }
    setIndex(index() + 1)
  }

  return (
    <Form of={form} onSubmit={(output) => props.onSubmit(output)}>
      {/* Keyed by the step, so its fields render anew when it changes. */}
      <Show when={step()} keyed>
        {(current) => (
          <Layout form={form} nodes={current.children} indexes={[]} slots={props.slots ?? {}} />
        )}
      </Show>
      <Show when={index() > 0}>
        <button type="button" data-back="" onClick={() => setIndex(index() - 1)}>
          Back
        </button>
      </Show>
      <Show when={!isLast()} fallback={<button type="submit">Save</button>}>
        <button type="button" data-next="" onClick={next}>
          Next
        </button>
      </Show>
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

function Layout(props: LayoutProps) {
  return (
    <For each={props.nodes}>
      {(node) => (
        <Switch>
          <Match when={node.type === 'section' && node}>
            {(section) => (
              <fieldset>
                <legend>{section().section.label}</legend>
                <Layout {...props} nodes={section().children} />
              </fieldset>
            )}
          </Match>
          <Match when={node.type === 'row' && node}>
            {(row) => (
              // One line of a 12-column grid, where each cell takes its span.
              <div style={{ display: 'grid', 'grid-template-columns': 'repeat(12, 1fr)' }}>
                <For each={row().children}>
                  {(cell) => (
                    <div data-span={cell.span} style={{ 'grid-column': `span ${cell.span}` }}>
                      <Layout {...props} nodes={[cell]} />
                    </div>
                  )}
                </For>
              </div>
            )}
          </Match>
          <Match when={node.type === 'slot' && node}>{(slot) => props.slots[slot().name]}</Match>
          <Match when={node.type === 'field' && node}>
            {(field) => <Field {...props} node={field()} />}
          </Match>
        </Switch>
      )}
    </For>
  )
}

/** A field by its role. A group and an array render their fields from the layout. */
function Field(props: Omit<LayoutProps, 'nodes'> & { node: LayoutField }) {
  const node = () => props.node.node
  return (
    <Switch>
      <Match when={node().role === 'display'}>
        <Display node={node()} />
      </Match>
      <Match when={node().role === 'group'}>
        <fieldset>
          <legend>{node().field.label ?? node().field.name}</legend>
          <Layout
            form={props.form}
            nodes={props.node.children}
            indexes={props.indexes}
            slots={props.slots}
          />
        </fieldset>
      </Match>
      <Match when={node().role === 'array'}>
        <ArrayField form={props.form} node={props.node} indexes={props.indexes} />
      </Match>
      <Match when={node().role === 'value'}>
        <ValueField form={props.form} node={node()} indexes={props.indexes} />
      </Match>
    </Switch>
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

/** A list: Formisch's field array, and the layout of each item. A slot never is in one. */
function ArrayField(props: { form: FormStore; node: LayoutField; indexes: readonly number[] }) {
  // A getter, so the path follows the item when one before it is removed. It comes from the
  // definition at runtime, so Formisch's types can't check it.
  const path = () => toFieldPath(props.node.node.dataPath, props.indexes)
  const array = useFieldArray(props.form, () => ({ path: path() as never }))
  const add = () =>
    insert(props.form, {
      path: path() as never,
      initialInput: builder.getItemInput(props.node.node.field) as never,
    })
  return (
    <fieldset>
      <legend>{props.node.node.field.label ?? props.node.node.field.name}</legend>
      <For each={array.items}>
        {(_, index) => (
          <div>
            <Layout
              form={props.form}
              nodes={props.node.children}
              indexes={[...props.indexes, index()]}
              slots={{}}
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

function ValueField(props: { form: FormStore; node: FieldNode; indexes: readonly number[] }) {
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
```

## Svelte

```sh
pnpm add @whatsaaaa/form-builder-schema @formisch/svelte svelte valibot
```

- `createForm` makes the form. `untrack` reads the definition once, as Formisch reads its config once.
- Pass the form and the path to `useField` and `useFieldArray` as getters, so a field follows its item when one before it is removed.
- Each component has a file of its own. `Layout` renders itself for a section, a row's cell and a group, and `builder.ts` shares one builder.
- The content of a slot is a snippet, which `Layout` renders with `{@render}`.

<!-- example: svelte/builder.ts -->

```ts
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'

/** One builder for the schema, the initial input, the layout and new array items. */
export const builder = createSchemaBuilder()
```

<!-- example: svelte/JsonFormView.svelte -->

```svelte
<script lang="ts">
  import {
    createForm,
    focus,
    Form,
    getInput,
    setErrors,
    type SubmitHandler,
    validate,
  } from '@formisch/svelte'
  import {
    fieldPathsOf,
    issuesOfStep,
    type JsonForm,
    type JsonFormSchema,
    type LayoutStep,
  } from '@whatsaaaa/form-builder-schema'
  import { type Snippet, untrack } from 'svelte'
  import { builder } from './builder'
  import Layout from './Layout.svelte'

  let {
    json,
    onsubmit,
    slots = {},
  }: {
    json: JsonForm
    onsubmit: SubmitHandler<JsonFormSchema>
    /** The content of the layout's slots, by name. */
    slots?: Record<string, Snippet>
  } = $props()

  // Formisch reads its config once, so read the definition once too.
  const { steps, ...config } = untrack(() => ({
    schema: builder.build(json),
    initialInput: builder.getInitialInput(json),
    steps: builder.getLayout(json).steps,
  }))
  const form = createForm(config)
  let index = $state(0)
  const step = $derived(steps[index] as LayoutStep)

  // Next validates the whole form, and only the issues on this step's fields keep the user here.
  async function next() {
    const found = issuesOfStep(step, (await validate(form)).issues)
    if (found.length) {
      const first = found.find((issue) => issue.field.role === 'value')
      if (first) focus(form, { path: first.path as never })
      return
    }
    // That validation set errors on the next step's fields too, which nobody saw.
    for (const path of fieldPathsOf(steps[index + 1] as LayoutStep, getInput(form))) {
      setErrors(form, { path, errors: null } as never)
    }
    index += 1
  }
</script>

<Form of={form} onsubmit={(output) => onsubmit(output)}>
  <!-- Keyed by the step, so its fields render anew when it changes. -->
  {#key index}
    <Layout {form} nodes={step.children} indexes={[]} {slots} />
  {/key}
  {#if index > 0}
    <button type="button" data-back="" onclick={() => (index -= 1)}>Back</button>
  {/if}
  {#if index < steps.length - 1}
    <button type="button" data-next="" onclick={next}>Next</button>
  {:else}
    <button type="submit">Save</button>
  {/if}
</Form>
```

<!-- example: svelte/Layout.svelte -->

```svelte
<script lang="ts">
  import type { FormStore } from '@formisch/svelte'
  import type { LayoutNode } from '@whatsaaaa/form-builder-schema'
  import type { Snippet } from 'svelte'
  import ArrayField from './ArrayField.svelte'
  import Layout from './Layout.svelte'
  import ValueField from './ValueField.svelte'

  let {
    form,
    nodes,
    indexes,
    slots,
  }: {
    form: FormStore
    nodes: readonly LayoutNode[]
    /** The index of each array item the nodes are in, outermost first. */
    indexes: readonly number[]
    /** The content of the layout's slots, by name. */
    slots: Record<string, Snippet>
  } = $props()
</script>

{#each nodes as node (node.key)}
  {#if node.type === 'section'}
    <fieldset>
      <legend>{node.section.label}</legend>
      <Layout {form} nodes={node.children} {indexes} {slots} />
    </fieldset>
  {:else if node.type === 'row'}
    <!-- One line of a 12-column grid, where each cell takes its span. -->
    <div style="display: grid; grid-template-columns: repeat(12, 1fr)">
      {#each node.children as cell (cell.key)}
        <div data-span={cell.span} style:grid-column="span {cell.span}">
          <Layout {form} nodes={[cell]} {indexes} {slots} />
        </div>
      {/each}
    </div>
  {:else if node.type === 'slot'}
    {@render slots[node.name]?.()}
  {:else if node.node.role === 'display'}
    {#if node.node.type === 'heading'}
      <svelte:element this={`h${Number(node.node.field.level ?? 2)}`}>
        {node.node.field.text}
      </svelte:element>
    {:else if node.node.type === 'paragraph'}
      <p>{node.node.field.text}</p>
    {:else}
      <hr />
    {/if}
  {:else if node.node.role === 'group'}
    <fieldset>
      <legend>{node.node.field.label ?? node.node.field.name}</legend>
      <Layout {form} nodes={node.children} {indexes} {slots} />
    </fieldset>
  {:else if node.node.role === 'array'}
    <ArrayField {form} {node} {indexes} />
  {:else}
    <ValueField {form} node={node.node} {indexes} />
  {/if}
{/each}
```

<!-- example: svelte/ArrayField.svelte -->

```svelte
<script lang="ts">
  import { type FormStore, insert, remove, useFieldArray } from '@formisch/svelte'
  import { type LayoutField, toFieldPath } from '@whatsaaaa/form-builder-schema'
  import { builder } from './builder'
  import Layout from './Layout.svelte'

  // A list: Formisch's field array, and the layout of each item. A slot never is in one.
  let { form, node, indexes }: { form: FormStore; node: LayoutField; indexes: readonly number[] } =
    $props()

  // Derived, so the path follows the item when one before it is removed. It comes from the
  // definition at runtime, so Formisch's types can't check it.
  const path = $derived(toFieldPath(node.node.dataPath, indexes))
  const array = useFieldArray(
    () => form,
    () => ({ path: path as never }),
  )
  const add = () =>
    insert(form, {
      path: path as never,
      initialInput: builder.getItemInput(node.node.field) as never,
    })
</script>

<fieldset>
  <legend>{node.node.field.label ?? node.node.field.name}</legend>
  {#each array.items as item, index (item)}
    <div>
      <Layout {form} nodes={node.children} indexes={[...indexes, index]} slots={{}} />
      <button
        type="button"
        data-remove={`${path.join('.')}.${index}`}
        onclick={() => remove(form, { path: path as never, at: index })}
      >
        Remove
      </button>
    </div>
  {/each}
  <button type="button" data-add={path.join('.')} onclick={add}>Add</button>
  {#if array.errors}
    <small data-error={path.join('.')}>{array.errors[0]}</small>
  {/if}
</fieldset>
```

<!-- example: svelte/ValueField.svelte -->

```svelte
<script lang="ts">
  import { type FormStore, useField } from '@formisch/svelte'
  import {
    coerceInput,
    type FieldNode,
    isRequired,
    toFieldPath,
  } from '@whatsaaaa/form-builder-schema'

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

  let { form, node, indexes }: { form: FormStore; node: FieldNode; indexes: readonly number[] } =
    $props()

  const path = $derived(toFieldPath(node.dataPath, indexes))
  const field = useField(
    () => form,
    () => ({ path: path as never }),
  )
  // Turns what the element gives into the field's value, e.g. '5' into 5 for a number.
  const set = (input: unknown) => field.onInput(coerceInput(input, node) as never)
  const input = $derived(field.input as unknown)
  const picked = $derived(Array.isArray(input) ? (input as unknown[]) : [])
  const options = $derived((node.field.options ?? []) as Option[])
  const multiple = $derived(node.kind === 'array')

  // A select's value is the option's index, and the option sets its own value.
  const choose = (element: HTMLSelectElement) => {
    const values = [...element.selectedOptions].map((option) => options[Number(option.value)]?.value)
    set(multiple ? values : values[0])
  }
  // A checkbox of a multiselect adds its option's value, or takes it out.
  const toggle = (option: Option, checked: boolean) =>
    set(checked ? [...picked, option.value] : picked.filter((value) => value !== option.value))
</script>

{#snippet label()}
  <span>{node.field.label ?? node.field.name}{isRequired(node.field) ? ' *' : ''}</span>
{/snippet}

{#snippet error()}
  {#if field.errors}
    <small data-error={path.join('.')}>{field.errors[0]}</small>
  {/if}
{/snippet}

<!-- Radio buttons and checkboxes set their option's own value, so 2 stays a number. -->
{#if node.type === 'radio' || (node.type === 'multiselect' && node.field.ui?.widget === 'checkboxes')}
  <fieldset>
    <legend>{@render label()}</legend>
    {#each options as option (option.value)}
      <label>
        {#if node.type === 'radio'}
          <input
            {...field.props}
            type="radio"
            checked={input === option.value}
            oninput={() => set(option.value)}
          />
        {:else}
          <input
            {...field.props}
            type="checkbox"
            checked={picked.includes(option.value)}
            oninput={(e) => toggle(option, e.currentTarget.checked)}
          />
        {/if}
        {option.label}
      </label>
    {/each}
    {@render error()}
  </fieldset>
{:else}
  <label>
    {@render label()}
    {#if node.type === 'checkbox'}
      <input
        {...field.props}
        type="checkbox"
        checked={input === true}
        oninput={(e) => set(e.currentTarget.checked)}
      />
    {:else if options.length}
      <select {...field.props} {multiple} oninput={(e) => choose(e.currentTarget)}>
        {#if !multiple}
          <option value={-1}>Choose…</option>
        {/if}
        {#each options as option, i (option.value)}
          <option
            value={i}
            selected={multiple ? picked.includes(option.value) : input === option.value}
          >
            {option.label}
          </option>
        {/each}
      </select>
    {:else if node.type === 'file'}
      <!-- Never set a file input's value. It gives a FileList, which coerceInput reads. -->
      <input
        {...field.props}
        type="file"
        {multiple}
        accept={node.field.accept as string | undefined}
        oninput={(e) => set(e.currentTarget.files)}
      />
    {:else if node.type === 'textarea'}
      <textarea
        {...field.props}
        value={(input as string | undefined) ?? ''}
        oninput={(e) => set(e.currentTarget.value)}
      ></textarea>
    {:else}
      <input
        {...field.props}
        type={inputTypes[node.type] ?? 'text'}
        value={(input as string | number | undefined) ?? ''}
        placeholder={node.field.placeholder}
        oninput={(e) => set(e.currentTarget.value)}
      />
    {/if}
    {@render error()}
  </label>
{/if}
```

## Qwik

```sh
pnpm add @whatsaaaa/form-builder-schema @formisch/qwik @qwik.dev/core valibot
```

- `useForm$` takes a function that returns the config. Formisch calls it again wherever the form resumes, so the schema is built there from the definition, which is JSON.
- Field state is a signal: read `field.input.value` and `field.errors.value`. `field.onInput` is a QRL, and so is `set`, so the handlers can call it.
- Formisch for Qwik keeps a JSON copy of the schema, so it can't hold `v.lazy`. The built schema never uses it.

<!-- example: qwik/json-form-view.tsx -->

```tsx
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
  useForm$,
  validate,
} from '@formisch/qwik'
import { $, component$, Fragment, type JSXOutput, type QRL, useSignal } from '@qwik.dev/core'
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
} from '@whatsaaaa/form-builder-schema'

const builder = createSchemaBuilder()

/** The content of the layout's slots, by name. */
type Slots = Record<string, JSXOutput>

interface JsonFormViewProps {
  json: JsonForm
  onSubmit$: QRL<SubmitHandler<JsonFormSchema>>
  slots?: Slots
}

export const JsonFormView = component$<JsonFormViewProps>(({ json, onSubmit$, slots = {} }) => {
  // Formisch makes the schema again from this function wherever the form resumes.
  const form = useForm$(() => ({
    schema: builder.build(json),
    initialInput: builder.getInitialInput(json),
  }))
  const { steps } = builder.getLayout(json)
  const index = useSignal(0)
  const step = steps[index.value] as LayoutStep

  // Next validates the whole form, and only the issues on this step's fields keep the user here.
  const next = $(async () => {
    const found = issuesOfStep(step, (await validate(form)).issues)
    if (found.length) {
      const first = found.find((issue) => issue.field.role === 'value')
      if (first) focus(form, { path: first.path as never })
      return
    }
    // That validation set errors on the next step's fields too, which nobody saw.
    for (const path of fieldPathsOf(steps[index.value + 1] as LayoutStep, getInput(form))) {
      setErrors(form, { path, errors: null } as never)
    }
    index.value += 1
  })

  return (
    <Form of={form} onSubmit$={onSubmit$}>
      {/* Keyed by the step, so another step's fields don't take over this one's components. */}
      <Layout key={index.value} form={form} nodes={step.children} indexes={[]} slots={slots} />
      {index.value > 0 && (
        <button type="button" data-back="" onClick$={() => (index.value -= 1)}>
          Back
        </button>
      )}
      {index.value < steps.length - 1 ? (
        <button type="button" data-next="" onClick$={next}>
          Next
        </button>
      ) : (
        <button type="submit">Save</button>
      )}
    </Form>
  )
})

interface LayoutProps {
  form: FormStore
  nodes: readonly LayoutNode[]
  /** The index of each array item the nodes are in, outermost first. */
  indexes: readonly number[]
  slots: Slots
}

const Layout = component$<LayoutProps>(({ form, nodes, indexes, slots }) => {
  return nodes.map((node) => {
    switch (node.type) {
      case 'section':
        return (
          <fieldset key={node.key}>
            <legend>{node.section.label}</legend>
            <Layout form={form} nodes={node.children} indexes={indexes} slots={slots} />
          </fieldset>
        )
      case 'row':
        // One line of a 12-column grid, where each cell takes its span.
        return (
          <div key={node.key} style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
            {node.children.map((cell) => (
              <div key={cell.key} data-span={cell.span} style={{ gridColumn: `span ${cell.span}` }}>
                <Layout form={form} nodes={[cell]} indexes={indexes} slots={slots} />
              </div>
            ))}
          </div>
        )
      case 'slot':
        return <Fragment key={node.key}>{slots[node.name]}</Fragment>
      case 'field':
        return <Field key={node.key} form={form} node={node} indexes={indexes} slots={slots} />
    }
  })
})

/** A field by its role. A group and an array render their fields from the layout. */
const Field = component$<Omit<LayoutProps, 'nodes'> & { node: LayoutField }>(
  ({ form, node, indexes, slots }) => {
    switch (node.node.role) {
      case 'display':
        return <Display node={node.node} />
      case 'group':
        return (
          <fieldset>
            <legend>{node.node.field.label ?? node.node.field.name}</legend>
            <Layout form={form} nodes={node.children} indexes={indexes} slots={slots} />
          </fieldset>
        )
      case 'array':
        return <ArrayField form={form} node={node} indexes={indexes} />
      case 'value':
        return <ValueField form={form} node={node.node} indexes={indexes} />
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
const ArrayField = component$<{ form: FormStore; node: LayoutField; indexes: readonly number[] }>(
  ({ form, node, indexes }) => {
    const { field, dataPath } = node.node
    const path = toFieldPath(dataPath, indexes)
    // The path comes from the definition at runtime, so Formisch's types can't check it.
    const array = useFieldArray(form, { path: path as never })
    return (
      <fieldset>
        <legend>{field.label ?? field.name}</legend>
        {array.items.value.map((item, index) => (
          <div key={item}>
            <Layout form={form} nodes={node.children} indexes={[...indexes, index]} slots={{}} />
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
```

## Angular

```sh
pnpm add @whatsaaaa/form-builder-schema @formisch/angular valibot
```

- `injectForm` needs an injection context, and the definition is an input, which is set from `ngOnInit`. So `ngOnInit` makes the form in the component's injector.
- Pass the path to `injectField` and `injectFieldArray` as a signal, so a field follows its item when one before it is removed.
- `[formischControl]` reads and writes the element when the element holds the field's value: text, a checkbox, files. A number, and an option's own value, are set with `field.setInput` instead, with the field's name bound to the element.
- The content of a slot is an `<ng-template>`: pass the `TemplateRef`s in `slots`, and `ngTemplateOutlet` renders each where the layout puts it.
- A new Angular app turns on `noPropertyAccessFromIndexSignature`, so the props of a field's type, which `JsonField` doesn't name, are read with brackets: `node.field['text']`, `field.ui?.['widget']`.

<!-- example: angular/json-form-view.ts -->

```ts
import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  computed,
  forwardRef,
  inject,
  Injector,
  input,
  type OnInit,
  output,
  runInInjectionContext,
  signal,
  type TemplateRef,
} from '@angular/core'
import {
  focus,
  FormischControl,
  FormischForm,
  type FormStore,
  getInput,
  injectField,
  injectFieldArray,
  injectForm,
  insert,
  remove,
  setErrors,
  validate,
} from '@formisch/angular'
import {
  coerceInput,
  createSchemaBuilder,
  type FieldNode,
  fieldPathsOf,
  isRequired,
  issuesOfStep,
  type JsonForm,
  type LayoutField,
  type LayoutNode,
  type LayoutStep,
  toFieldPath,
} from '@whatsaaaa/form-builder-schema'

const builder = createSchemaBuilder()

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

/**
 * A field with a value. `[formischControl]` reads and writes the element when its value is the
 * field's: text, a checkbox, files. A number, and an option's own value, are set with `setInput`.
 */
@Component({
  selector: 'json-value-field',
  imports: [FormischControl, NgTemplateOutlet],
  template: `
    <ng-template #label>
      <span>{{ node().field.label ?? node().field.name }}{{ required() ? ' *' : '' }}</span>
    </ng-template>
    <ng-template #error>
      @if (field.errors(); as errors) {
        <small [attr.data-error]="path().join('.')">{{ errors[0] }}</small>
      }
    </ng-template>

    @switch (control()) {
      @case ('radio') {
        <fieldset>
          <legend><ng-container [ngTemplateOutlet]="label" /></legend>
          @for (option of options(); track option.value) {
            <label>
              <input
                type="radio"
                [attr.name]="field.name()"
                [checked]="input() === option.value"
                (input)="set(option.value)"
              />
              {{ option.label }}
            </label>
          }
          <ng-container [ngTemplateOutlet]="error" />
        </fieldset>
      }
      @case ('checkboxes') {
        <fieldset>
          <legend><ng-container [ngTemplateOutlet]="label" /></legend>
          @for (option of options(); track option.value) {
            <label>
              <input
                type="checkbox"
                [attr.name]="field.name()"
                [checked]="picked().includes(option.value)"
                (input)="toggle(option, $any($event.target).checked)"
              />
              {{ option.label }}
            </label>
          }
          <ng-container [ngTemplateOutlet]="error" />
        </fieldset>
      }
      @default {
        <label>
          <ng-container [ngTemplateOutlet]="label" />
          @switch (control()) {
            @case ('checkbox') {
              <input [formischControl]="field" type="checkbox" />
            }
            @case ('select') {
              <select
                [attr.name]="field.name()"
                [multiple]="multiple()"
                (input)="choose($any($event.target))"
              >
                @if (!multiple()) {
                  <option value="-1">Choose…</option>
                }
                @for (option of options(); track option.value; let i = $index) {
                  <option [value]="i" [selected]="isPicked(option)">{{ option.label }}</option>
                }
              </select>
            }
            @case ('file') {
              <input
                [formischControl]="field"
                type="file"
                [multiple]="multiple()"
                [attr.accept]="node().field['accept']"
              />
            }
            @case ('textarea') {
              <textarea [formischControl]="field"></textarea>
            }
            @case ('number') {
              <input
                type="number"
                [attr.name]="field.name()"
                [value]="input() ?? ''"
                [attr.placeholder]="node().field.placeholder"
                (input)="set($any($event.target).value)"
              />
            }
            @default {
              <input
                [formischControl]="field"
                [type]="inputType()"
                [attr.placeholder]="node().field.placeholder"
              />
            }
          }
          <ng-container [ngTemplateOutlet]="error" />
        </label>
      }
    }
  `,
})
export class ValueField {
  readonly form = input.required<FormStore>()
  readonly node = input.required<FieldNode>()
  /** The index of each array item the field is in, outermost first. */
  readonly indexes = input.required<readonly number[]>()

  protected readonly path = computed(() => toFieldPath(this.node().dataPath, this.indexes()))
  // A signal, so the field follows its item when one before it is removed. The path comes from
  // the definition at runtime, so Formisch's types can't check it.
  protected readonly field = injectField(this.form, { path: this.path as never })

  protected readonly input = computed((): unknown => this.field.input())
  protected readonly required = computed(() => isRequired(this.node().field))
  protected readonly options = computed(() => (this.node().field['options'] ?? []) as Option[])
  protected readonly multiple = computed(() => this.node().kind === 'array')
  protected readonly picked = computed(() => {
    const input = this.input()
    return Array.isArray(input) ? (input as unknown[]) : []
  })
  protected readonly inputType = computed(() => inputTypes[this.node().type] ?? 'text')

  /** Which control the field gets, by its type and kind. */
  protected readonly control = computed(() => {
    const { type, kind, field } = this.node()
    if (type === 'radio') return 'radio'
    if (type === 'multiselect' && field.ui?.['widget'] === 'checkboxes') return 'checkboxes'
    if (type === 'checkbox' || type === 'file' || type === 'textarea') return type
    if (this.options().length) return 'select'
    return kind === 'number' ? 'number' : 'input'
  })

  /** Turns what the element gives into the field's value, e.g. '5' into 5 for a number. */
  protected set(input: unknown): void {
    this.field.setInput(coerceInput(input, this.node()) as never)
  }

  /** A checkbox of a multiselect adds its option's value, or takes it out. */
  protected toggle(option: Option, checked: boolean): void {
    const picked = this.picked()
    this.set(checked ? [...picked, option.value] : picked.filter((value) => value !== option.value))
  }

  /** A select's value is the option's index, and the option sets its own value. */
  protected choose(select: HTMLSelectElement): void {
    const values = [...select.selectedOptions].map(
      (element) => this.options()[Number(element.value)]?.value,
    )
    this.set(this.multiple() ? values : values[0])
  }

  protected isPicked(option: Option): boolean {
    return this.multiple() ? this.picked().includes(option.value) : this.input() === option.value
  }
}

/** A list: Formisch's field array, and the layout of each item. A slot never is in one. */
@Component({
  selector: 'json-array-field',
  imports: [forwardRef(() => JsonLayout)],
  template: `
    <fieldset>
      <legend>{{ field().label ?? field().name }}</legend>
      @for (item of array.items(); track item; let index = $index) {
        <div>
          <json-layout
            [form]="form()"
            [nodes]="node().children"
            [indexes]="[...indexes(), index]"
            [slots]="{}"
          />
          <button
            type="button"
            [attr.data-remove]="dotPath() + '.' + index"
            (click)="remove(index)"
          >
            Remove
          </button>
        </div>
      }
      <button type="button" [attr.data-add]="dotPath()" (click)="add()">Add</button>
      @if (array.errors(); as errors) {
        <small [attr.data-error]="dotPath()">{{ errors[0] }}</small>
      }
    </fieldset>
  `,
})
export class ArrayField {
  readonly form = input.required<FormStore>()
  readonly node = input.required<LayoutField>()
  readonly indexes = input.required<readonly number[]>()

  protected readonly field = computed(() => this.node().node.field)
  protected readonly path = computed(() => toFieldPath(this.node().node.dataPath, this.indexes()))
  protected readonly dotPath = computed(() => this.path().join('.'))
  protected readonly array = injectFieldArray(this.form, { path: this.path as never })

  protected add(): void {
    insert(this.form(), {
      path: this.path() as never,
      initialInput: builder.getItemInput(this.field()) as never,
    })
  }

  protected remove(index: number): void {
    remove(this.form(), { path: this.path() as never, at: index })
  }
}

/** The content of the layout's slots, by name. */
type Slots = Readonly<Record<string, TemplateRef<unknown>>>

/** The nodes of a step, a section, a row's cell, a group or an array item, each by its type. */
@Component({
  selector: 'json-layout',
  imports: [ArrayField, NgTemplateOutlet, ValueField],
  template: `
    @for (node of nodes(); track node.key) {
      @if (node.type === 'section') {
        <fieldset>
          <legend>{{ node.section.label }}</legend>
          <json-layout
            [form]="form()"
            [nodes]="node.children"
            [indexes]="indexes()"
            [slots]="slots()"
          />
        </fieldset>
      } @else if (node.type === 'row') {
        <!-- One line of a 12-column grid, where each cell takes its span. -->
        <div style="display: grid; grid-template-columns: repeat(12, 1fr)">
          @for (cell of node.children; track cell.key) {
            <div [attr.data-span]="cell.span" [style.grid-column]="'span ' + cell.span">
              <json-layout
                [form]="form()"
                [nodes]="[cell]"
                [indexes]="indexes()"
                [slots]="slots()"
              />
            </div>
          }
        </div>
      } @else if (node.type === 'slot') {
        <ng-container [ngTemplateOutlet]="slots()[node.name] ?? null" />
      } @else if (node.node.role === 'display') {
        @if (node.node.type === 'heading') {
          @switch (node.node.field['level'] ?? 2) {
            @case (1) {
              <h1>{{ node.node.field['text'] }}</h1>
            }
            @case (3) {
              <h3>{{ node.node.field['text'] }}</h3>
            }
            @case (4) {
              <h4>{{ node.node.field['text'] }}</h4>
            }
            @case (5) {
              <h5>{{ node.node.field['text'] }}</h5>
            }
            @case (6) {
              <h6>{{ node.node.field['text'] }}</h6>
            }
            @default {
              <h2>{{ node.node.field['text'] }}</h2>
            }
          }
        } @else if (node.node.type === 'paragraph') {
          <p>{{ node.node.field['text'] }}</p>
        } @else {
          <hr />
        }
      } @else if (node.node.role === 'group') {
        <fieldset>
          <legend>{{ node.node.field.label ?? node.node.field.name }}</legend>
          <json-layout
            [form]="form()"
            [nodes]="node.children"
            [indexes]="indexes()"
            [slots]="slots()"
          />
        </fieldset>
      } @else if (node.node.role === 'array') {
        <json-array-field [form]="form()" [node]="node" [indexes]="indexes()" />
      } @else {
        <json-value-field [form]="form()" [node]="node.node" [indexes]="indexes()" />
      }
    }
  `,
})
export class JsonLayout {
  readonly form = input.required<FormStore>()
  readonly nodes = input.required<readonly LayoutNode[]>()
  /** The index of each array item the nodes are in, outermost first. */
  readonly indexes = input.required<readonly number[]>()
  readonly slots = input.required<Slots>()
}

/** Renders a definition as a Formisch form, a step at a time, and emits the output on submit. */
@Component({
  selector: 'json-form-view',
  imports: [FormischForm, JsonLayout],
  template: `
    @if (form; as form) {
      <form [formischForm]="form" [formischSubmit]="handleSubmit">
        <!-- Tracked by the step, so its fields render anew when it changes. -->
        @for (current of [step()]; track current) {
          <json-layout [form]="form" [nodes]="current.children" [indexes]="[]" [slots]="slots()" />
        }
        @if (index() > 0) {
          <button type="button" data-back="" (click)="index.set(index() - 1)">Back</button>
        }
        @if (index() < steps.length - 1) {
          <button type="button" data-next="" (click)="next()">Next</button>
        } @else {
          <button type="submit">Save</button>
        }
      </form>
    }
  `,
})
export class JsonFormView implements OnInit {
  readonly json = input.required<JsonForm>()
  readonly slots = input<Slots>({})
  readonly submitted = output<unknown>()

  private readonly injector = inject(Injector)
  protected form: FormStore | undefined
  protected steps: readonly LayoutStep[] = []
  protected readonly index = signal(0)
  protected readonly step = computed(() => this.steps[this.index()] as LayoutStep)

  // Formisch reads its config once, in an injection context. Inputs are set from ngOnInit.
  ngOnInit(): void {
    const json = this.json()
    this.steps = builder.getLayout(json).steps
    this.form = runInInjectionContext(this.injector, () =>
      injectForm({ schema: builder.build(json), initialInput: builder.getInitialInput(json) }),
    )
  }

  /** Validates the whole form. Only the issues on this step's fields keep the user here. */
  protected async next(): Promise<void> {
    const form = this.form as FormStore
    const found = issuesOfStep(this.step(), (await validate(form)).issues)
    if (found.length) {
      const first = found.find((issue) => issue.field.role === 'value')
      if (first) focus(form, { path: first.path as never })
      return
    }
    // That validation set errors on the next step's fields too, which nobody saw.
    const following = this.steps[this.index() + 1] as LayoutStep
    for (const path of fieldPathsOf(following, getInput(form))) {
      setErrors(form, { path, errors: null } as never)
    }
    this.index.set(this.index() + 1)
  }

  protected readonly handleSubmit = (output: unknown) => this.submitted.emit(output)
}
```
