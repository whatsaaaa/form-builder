<!-- The code blocks are the files in integration/examples, copied by `pnpm docs:gen`. Edit the files, not the blocks. -->

# Formisch in each framework

The schema package works with Formisch's own package for every framework, with no adapter from this repo. Here is a whole renderer for each of Preact, Solid, Svelte, Qwik and Angular. Each has the shape of the React one in [Using with Formisch](../README.md#using-with-formisch), with the native control of every built-in type from [Controls](../README.md#controls). For Vue and React, use [`@whatsaaaa/form-builder-vue`](https://github.com/whatsaaaa/form-builder/tree/main/frameworks/vue) and [`@whatsaaaa/form-builder-react`](https://github.com/whatsaaaa/form-builder/tree/main/frameworks/react).

Every renderer is tested. The [integration tests](https://github.com/whatsaaaa/form-builder/tree/main/integration/examples) run every shared fixture through it, from a text field to arrays and form rules: they type, tick, pick and submit like a person, and check the errors the form shows and what it submits.

Each one has the same parts:

- **`JsonFormView`** reads the definition once: the schema and initial input for Formisch's form, and the field tree to render.
- **`Fields`** renders each node of the tree by its `role`.
- **`ArrayField`** renders Formisch's field array, the fields of each item, and buttons to add and remove items. A new item's input is `builder.getItemInput(node.field)`.
- **`ValueField`** connects a field to Formisch at its path, from `toFieldPath(node.dataPath, indexes)`, picks the control by the field's type, and sets what the element gives through `coerceInput`.

The `data-error`, `data-add` and `data-remove` attributes only mark elements for the tests. Leave them out.

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
```

## Svelte

```sh
pnpm add @whatsaaaa/form-builder-schema @formisch/svelte svelte valibot
```

- `createForm` makes the form. `untrack` reads the definition once, as Formisch reads its config once.
- Pass the form and the path to `useField` and `useFieldArray` as getters, so a field follows its item when one before it is removed.
- Each component has a file of its own. `Fields` renders itself for a group, and `builder.ts` shares one builder.

<!-- example: svelte/builder.ts -->

```ts
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'

/** One builder for the schema, the initial input, the field tree and new array items. */
export const builder = createSchemaBuilder()
```

<!-- example: svelte/JsonFormView.svelte -->

```svelte
<script lang="ts">
  import { createForm, Form, type SubmitHandler } from '@formisch/svelte'
  import type { JsonForm, JsonFormSchema } from '@whatsaaaa/form-builder-schema'
  import { untrack } from 'svelte'
  import { builder } from './builder'
  import Fields from './Fields.svelte'

  let { json, onsubmit }: { json: JsonForm; onsubmit: SubmitHandler<JsonFormSchema> } = $props()

  // Formisch reads its config once, so read the definition once too.
  const { fields, ...config } = untrack(() => ({
    schema: builder.build(json),
    initialInput: builder.getInitialInput(json),
    fields: builder.getFieldTree(json),
  }))
  const form = createForm(config)
</script>

<Form of={form} onsubmit={(output) => onsubmit(output)}>
  <Fields {form} nodes={fields} indexes={[]} />
  <button type="submit">Save</button>
</Form>
```

<!-- example: svelte/Fields.svelte -->

```svelte
<script lang="ts">
  import type { FormStore } from '@formisch/svelte'
  import type { FieldNode } from '@whatsaaaa/form-builder-schema'
  import ArrayField from './ArrayField.svelte'
  import Fields from './Fields.svelte'
  import ValueField from './ValueField.svelte'

  let {
    form,
    nodes,
    indexes,
  }: {
    form: FormStore
    nodes: readonly FieldNode[]
    /** The index of each array item the fields are in, outermost first. */
    indexes: readonly number[]
  } = $props()
</script>

{#each nodes as node, position (node.field.name ?? `#${position}`)}
  {#if node.role === 'display'}
    {#if node.type === 'heading'}
      <svelte:element this={`h${Number(node.field.level ?? 2)}`}>{node.field.text}</svelte:element>
    {:else if node.type === 'paragraph'}
      <p>{node.field.text}</p>
    {:else}
      <hr />
    {/if}
  {:else if node.role === 'group'}
    <fieldset>
      <legend>{node.field.label ?? node.field.name}</legend>
      <Fields {form} nodes={node.children} {indexes} />
    </fieldset>
  {:else if node.role === 'array'}
    <ArrayField {form} {node} {indexes} />
  {:else}
    <ValueField {form} {node} {indexes} />
  {/if}
{/each}
```

<!-- example: svelte/ArrayField.svelte -->

```svelte
<script lang="ts">
  import { type FormStore, insert, remove, useFieldArray } from '@formisch/svelte'
  import { type FieldNode, toFieldPath } from '@whatsaaaa/form-builder-schema'
  import { builder } from './builder'
  import Fields from './Fields.svelte'

  let { form, node, indexes }: { form: FormStore; node: FieldNode; indexes: readonly number[] } =
    $props()

  // Derived, so the path follows the item when one before it is removed. It comes from the
  // definition at runtime, so Formisch's types can't check it.
  const path = $derived(toFieldPath(node.dataPath, indexes))
  const array = useFieldArray(
    () => form,
    () => ({ path: path as never }),
  )
  const add = () =>
    insert(form, { path: path as never, initialInput: builder.getItemInput(node.field) as never })
</script>

<fieldset>
  <legend>{node.field.label ?? node.field.name}</legend>
  {#each array.items as item, index (item)}
    <div>
      <Fields {form} nodes={node.children} indexes={[...indexes, index]} />
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
```

## Angular

```sh
pnpm add @whatsaaaa/form-builder-schema @formisch/angular valibot
```

- `injectForm` needs an injection context, and the definition is an input, which is set from `ngOnInit`. So `ngOnInit` makes the form in the component's injector.
- Pass the path to `injectField` and `injectFieldArray` as a signal, so a field follows its item when one before it is removed.
- `[formischControl]` reads and writes the element when the element holds the field's value: text, a checkbox, files. A number, and an option's own value, are set with `field.setInput` instead, with the field's name bound to the element.

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
} from '@angular/core'
import {
  FormischControl,
  FormischForm,
  type FormStore,
  injectField,
  injectFieldArray,
  injectForm,
  insert,
  remove,
} from '@formisch/angular'
import {
  coerceInput,
  createSchemaBuilder,
  type FieldNode,
  isRequired,
  type JsonForm,
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
                [attr.accept]="node().field.accept"
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
  protected readonly options = computed(() => (this.node().field.options ?? []) as Option[])
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
    if (type === 'multiselect' && field.ui?.widget === 'checkboxes') return 'checkboxes'
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

/** A container of kind `array`: Formisch's field array, and the fields of each item. */
@Component({
  selector: 'json-array-field',
  imports: [forwardRef(() => JsonFields)],
  template: `
    <fieldset>
      <legend>{{ node().field.label ?? node().field.name }}</legend>
      @for (item of array.items(); track item; let index = $index) {
        <div>
          <json-fields
            [form]="form()"
            [nodes]="node().children"
            [indexes]="[...indexes(), index]"
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
  readonly node = input.required<FieldNode>()
  readonly indexes = input.required<readonly number[]>()

  protected readonly path = computed(() => toFieldPath(this.node().dataPath, this.indexes()))
  protected readonly dotPath = computed(() => this.path().join('.'))
  protected readonly array = injectFieldArray(this.form, { path: this.path as never })

  protected add(): void {
    insert(this.form(), {
      path: this.path() as never,
      initialInput: builder.getItemInput(this.node().field) as never,
    })
  }

  protected remove(index: number): void {
    remove(this.form(), { path: this.path() as never, at: index })
  }
}

/** The fields of a definition, a group or an array item, each by its role. */
@Component({
  selector: 'json-fields',
  imports: [ArrayField, ValueField],
  template: `
    @for (node of nodes(); track $index) {
      @switch (node.role) {
        @case ('display') {
          @if (node.type === 'heading') {
            @switch (node.field.level ?? 2) {
              @case (1) {
                <h1>{{ node.field.text }}</h1>
              }
              @case (3) {
                <h3>{{ node.field.text }}</h3>
              }
              @case (4) {
                <h4>{{ node.field.text }}</h4>
              }
              @case (5) {
                <h5>{{ node.field.text }}</h5>
              }
              @case (6) {
                <h6>{{ node.field.text }}</h6>
              }
              @default {
                <h2>{{ node.field.text }}</h2>
              }
            }
          } @else if (node.type === 'paragraph') {
            <p>{{ node.field.text }}</p>
          } @else {
            <hr />
          }
        }
        @case ('group') {
          <fieldset>
            <legend>{{ node.field.label ?? node.field.name }}</legend>
            <json-fields [form]="form()" [nodes]="node.children" [indexes]="indexes()" />
          </fieldset>
        }
        @case ('array') {
          <json-array-field [form]="form()" [node]="node" [indexes]="indexes()" />
        }
        @case ('value') {
          <json-value-field [form]="form()" [node]="node" [indexes]="indexes()" />
        }
      }
    }
  `,
})
export class JsonFields {
  readonly form = input.required<FormStore>()
  readonly nodes = input.required<readonly FieldNode[]>()
  readonly indexes = input.required<readonly number[]>()
}

/** Renders a definition as a Formisch form, and emits the output when it submits. */
@Component({
  selector: 'json-form-view',
  imports: [FormischForm, JsonFields],
  template: `
    @if (form; as form) {
      <form [formischForm]="form" [formischSubmit]="handleSubmit">
        <json-fields [form]="form" [nodes]="fields" [indexes]="[]" />
        <button type="submit">Save</button>
      </form>
    }
  `,
})
export class JsonFormView implements OnInit {
  readonly json = input.required<JsonForm>()
  readonly submitted = output<unknown>()

  private readonly injector = inject(Injector)
  protected form: FormStore | undefined
  protected fields: readonly FieldNode[] = []

  // Formisch reads its config once, in an injection context. Inputs are set from ngOnInit.
  ngOnInit(): void {
    const json = this.json()
    this.fields = builder.getFieldTree(json)
    this.form = runInInjectionContext(this.injector, () =>
      injectForm({ schema: builder.build(json), initialInput: builder.getInitialInput(json) }),
    )
  }

  protected readonly handleSubmit = (output: unknown) => this.submitted.emit(output)
}
```
