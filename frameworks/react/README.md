# @whatsaaaa/form-builder-react

[![npm](https://img.shields.io/npm/v/@whatsaaaa/form-builder-react)](https://www.npmjs.com/package/@whatsaaaa/form-builder-react)

Render JSON form definitions with [Formisch](https://formisch.dev) and your own React components.

It's headless: it reads the definition, connects every field to Formisch and turns input into the values the schema expects, but it renders nothing of its own. You give it a component per field type, so it works with plain HTML, shadcn/ui or any other UI library.

## Install

```sh
pnpm add @whatsaaaa/form-builder-react @formisch/react valibot
```

React 18 or 19, `@formisch/react` 1.2 and Valibot 1.4.1 or later are required. `@whatsaaaa/form-builder-schema` comes with it.

## Usage

```tsx
import { Form } from '@formisch/react'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-react'
import { components } from './fields'

export function DefinitionForm({ definition }: { definition: JsonForm }) {
  const jsonForm = useJsonForm(definition, { components })

  function save(output: unknown) {
    // The output of the schema: trimmed, numbers as numbers, empty optional fields left out.
  }

  return (
    <Form of={jsonForm.form} onSubmit={save}>
      <JsonFields of={jsonForm} />
      <button type="submit">Save</button>
    </Form>
  )
}
```

- `useJsonForm(definition, options?)` builds the schema and the initial input, and creates the Formisch form. `jsonForm.form` is a normal Formisch form, so every Formisch method works on it.
- `<JsonFields>` renders the fields inside your `<Form>`. The form element, the submit button and anything around them are yours.
- A definition with issues throws the builder's `DefinitionError` while rendering, so an error boundary can catch it. Run `validate()` first when the definition comes from outside your code.
- Like Formisch's `useForm`, `useJsonForm` reads the definition on the first render. To show another one, give the component that calls `useJsonForm` a new `key`: `<DefinitionForm key={id} definition={definition} />`.

### Options

```ts
useJsonForm(definition, {
  builder: createSchemaBuilder({ fieldTypes: { money } }), // your own types, rules and messages
  components, // your component per field type, see below
  layoutComponents, // your component per layout type, see Layout
  validate: 'blur', // when a field is validated the first time, as in Formisch
  revalidate: 'input', // when it is validated again
})
```

`builder`, `validate` and `revalidate` are read on the first render, with the definition. `components` and `layoutComponents` are read on every render.

## Components

`components` has one component per field type, by type name. Pass it to `useJsonForm`, or to `<JsonFields>` and `<JsonField>` as a prop, which wins. Several types can share one:

```ts
import type { FieldComponents } from '@whatsaaaa/form-builder-react'

export const components: FieldComponents = {
  text: TextInput,
  email: TextInput,
  number: TextInput,
  select: SelectInput,
  group: Fieldset,
  array: Repeater,
  heading: Heading,
  // …one for every type your definitions use
}
```

A type that a definition uses but `components` doesn't have throws a `TypeError` that names every missing type, when `<JsonFields>` or `<JsonField>` renders. Only the fields it renders count.

What a component gets depends on the field's role:

| Role    | Which fields                   | Props                                                                            |
| ------- | ------------------------------ | -------------------------------------------------------------------------------- |
| value   | every field with a value       | `field`, `path`, `kind`, `required`, `input`, `errors`, `inputProps`, `setInput` |
| group   | a container of kind `object`   | `field`, `path`, `children`: the group's fields                                  |
| array   | a container of kind `array`    | `field`, `path`, `items`, `errors`, `add`, `remove`, `move`, `children(index)`   |
| display | a display element, kind `none` | `field`                                                                          |

The props are typed as `ValueFieldProps`, `GroupFieldProps`, `ArrayFieldProps` and `DisplayFieldProps`.

Your own container types render through the group or array role too, by their kind.

### A value field

```tsx
import type { ValueFieldProps } from '@whatsaaaa/form-builder-react'

export function TextInput({ field, kind, input, errors, inputProps, ...props }: ValueFieldProps) {
  return (
    <label>
      {field.label}
      <input
        {...inputProps}
        type={kind === 'number' ? 'number' : 'text'}
        value={String(input ?? '')}
        required={props.required}
        onChange={(e) => props.setInput(e.target.value)}
      />
      {errors && <small>{errors[0]}</small>}
    </label>
  )
}
```

- `field` is the field from the definition, with its `label`, `placeholder`, `options` and `ui`.
- `path` is its Formisch path with real indexes, like `['lines', 0, 'quantity']`.
- `inputProps` are Formisch's element props: the field's name, a ref, and focus, change and blur handlers. Spread them on the input element, so Formisch knows when the field is touched and can focus it after a failed submit. Your own `onChange` after the spread replaces Formisch's, and calls `setInput` instead.
- `required` is true when the definition makes the field required.

### setInput

`setInput` sets the field's input after turning what an input element gives into what the schema expects, by the field's kind:

| Kind                | Input                   | Value set                      |
| ------------------- | ----------------------- | ------------------------------ |
| `number`            | `''` or only spaces     | `undefined`                    |
| `number`            | a numeric string, `'5'` | `5`                            |
| `file`              | a `FileList`            | its first file, or `undefined` |
| `array` of `file`   | a `FileList`            | an array of its files          |
| `array` of `number` | numeric strings         | numbers                        |

Anything else is set as it is, and the schema reports it. For a choice, like a radio or a select, set the option's value from `field.options` rather than the element's value: that keeps `2` a number and `true` a boolean.

```tsx
const options = field.options as { value: string | number | boolean; label: string }[]

<select
  {...inputProps}
  value={options.findIndex((option) => option.value === input)}
  onChange={(e) => setInput(options[Number(e.target.value)]?.value)}
>
  <option value={-1}>Choose…</option>
  {options.map((option, i) => (
    <option key={i} value={i}>
      {option.label}
    </option>
  ))}
</select>
```

For a file input, pass the element's `files` with `onChange={(e) => setInput(e.target.files)}`, and never set its `value`.

`setInput` stays the same function while the field is the same, so it is safe in an effect's or a memo's dependencies.

### A group

```tsx
import type { GroupFieldProps } from '@whatsaaaa/form-builder-react'

export function Fieldset({ field, children }: GroupFieldProps) {
  return (
    <fieldset>
      <legend>{field.label}</legend>
      {children}
    </fieldset>
  )
}
```

### An array

```tsx
import type { ArrayFieldProps } from '@whatsaaaa/form-builder-react'

export function Repeater({ field, items, errors, add, remove, children }: ArrayFieldProps) {
  return (
    <fieldset>
      <legend>{field.label}</legend>
      {items.map((item, index) => (
        <div key={item}>
          {children(index)}
          <button type="button" onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={add}>
        Add
      </button>
      {errors && <small>{errors[0]}</small>}
    </fieldset>
  )
}
```

- `children(index)` renders the fields of the item at `index`.
- `items` has one id per item. Use it as the `key`, so each item keeps its inputs when one is removed or moved.
- `add()` adds an item at the end, with the defaults its fields have in the definition.
- `errors` are the array's own messages, like a required array's or `maxLength`'s. Its items' fields show their own.

### A display element

```tsx
import type { DisplayFieldProps } from '@whatsaaaa/form-builder-react'

export function Heading({ field }: DisplayFieldProps) {
  return <h2>{String(field.text ?? '')}</h2>
}
```

## Layout

A definition's [`layout`](https://github.com/whatsaaaa/form-builder/tree/main/packages/schema#layout) puts its fields in sections, rows of a 12-column grid and steps, and leaves slots for content of yours. `<JsonFields>` renders the current step of it. Give `useJsonForm` a component for each layout type the definition uses, and `<JsonFields>` the content of its slots:

```tsx
import type { LayoutComponents, RowProps, SectionProps } from '@whatsaaaa/form-builder-react'

function Section({ section, children }: SectionProps) {
  return (
    <fieldset>
      <legend>{section.label}</legend>
      {children}
    </fieldset>
  )
}

// One line of a 12-column grid. On a narrow screen, give each cell the whole row.
function Row({ spans, children }: RowProps) {
  return (
    <div className="row">
      {spans.map((span, index) => (
        <div key={index} style={{ gridColumn: `span ${span}` }}>
          {children(index)}
        </div>
      ))}
    </div>
  )
}

const layoutComponents: LayoutComponents = { section: Section, row: Row }

function Checkout({ definition }: { definition: JsonForm }) {
  const jsonForm = useJsonForm(definition, { components, layoutComponents })
  return (
    <Form of={jsonForm.form} onSubmit={save}>
      <JsonFields of={jsonForm} slots={{ submit: <button type="submit">Place order</button> }} />
    </Form>
  )
}
```

```css
.row {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1rem;
}
```

| Layout type | Props                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `section`   | `section`, as written, with its `id`, `label`, `description` and `ui`; `children`                                        |
| `row`       | `row`, as written, with its `id` and `ui`; `spans`, the span of each cell; `children(index)` renders the cell at `index` |

- `layoutComponents` goes to `useJsonForm`, or to `<JsonFields>` as a prop, which wins. A definition without sections or rows needs none, and one without a `layout` renders as it always did.
- A layout type the layout uses without a component, or a slot without content in `slots`, throws a `TypeError` naming each one, on every step.
- Display elements written in the layout render with your field components, like the ones in `fields`.
- `except` leaves fields out of the layout too, and a section or a row left without fields drops out. The other cells of a row keep their spans. `only` renders the fields it names without the layout.
- The spans are for a wide screen: the layout says nothing about narrow ones, so your row component decides, e.g. with a media query.

### Steps

`jsonForm.steps` is where the form is, and how to move:

```tsx
function Signup({ definition }: { definition: JsonForm }) {
  const jsonForm = useJsonForm(definition, { components, layoutComponents })
  const { steps } = jsonForm
  return (
    <Form of={jsonForm.form} onSubmit={save}>
      <ol>
        {steps.list.map((step, i) => (
          <li key={step.step.id ?? i} aria-current={i === steps.index ? 'step' : undefined}>
            {step.step.label}
          </li>
        ))}
      </ol>
      <JsonFields of={jsonForm} />
      {!steps.isFirst && (
        <button type="button" onClick={steps.back}>
          Back
        </button>
      )}
      {steps.isLast ? (
        <button type="submit">Sign up</button>
      ) : (
        <button type="button" onClick={() => void steps.next()}>
          Next
        </button>
      )}
    </Form>
  )
}
```

| Member              |                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------- |
| `list`              | every step, with its `step` as written (`id`, `label`, `description`, `ui`), `children` and `fields` |
| `index`, `current`  | the step `<JsonFields>` renders                                                                      |
| `isFirst`, `isLast` |                                                                                                      |
| `next()`            | validates, and moves on when the step's fields have no issues. Resolves to whether it moved          |
| `back()`            | moves back, without validating                                                                       |
| `goTo(index)`       | back freely; forward through each step on the way, stopping at the first with issues                 |

The form is one Formisch form, so Formisch validates all of it at once. The steps make that work:

- **Next** validates the whole form, and only the issues on the current step's fields keep the user there. It focuses the first one, in layout order.
- **A step shows what the user left**: the errors it had when they left it, and none the first time they get to it, so the issues of steps nobody saw yet stay out of sight.
- **A step that failed Next revalidates** as the user fixes it, on the `revalidate` event, like a form after a failed submit.
- **A submit before the last step is a Next**, so Enter in a step with a single text input doesn't submit the form early. On the last step, Formisch submits as usual.
- **A submit that fails because of an earlier step**, like a form rule that reads fields of two steps, goes back to that step.
- `<JsonFields step={2} />` renders a given step instead of the current one, e.g. on a review page. A form without steps has one, and nothing changes for it.

## Placing fields yourself

Without a `layout`, `<JsonFields>` renders every field in the order of the definition. To put some of them somewhere else, in code rather than in the definition, place them with `<JsonField>` and leave them out of `<JsonFields>` with `except`:

```tsx
<Form of={jsonForm.form} onSubmit={save}>
  <main>
    <JsonFields of={jsonForm} except={['coupon', 'acceptTerms']} />
  </main>
  <aside>
    <JsonField of={jsonForm} path="coupon" />
    <JsonField of={jsonForm} path="acceptTerms" />
    <button type="submit">Place order</button>
  </aside>
</Form>
```

- A path is the field's names joined with dots: `'email'`, or `'address.city'` for a field of a group. A placed field validates, focuses and submits like any other, because it is still part of the one Formisch form.
- A group or an array comes with all its fields. A field of an array's items can't be placed on its own, because it has no index outside its item, so place the array. To leave such a field out of every item, use `'*'` for the index: `except={['lines.*.note']}`.
- `only` renders just the fields it names, in the order of the definition: `<JsonFields of={jsonForm} only={['name', 'email']} />`. Display elements have no dot path, even with a name, so `only` leaves them out.
- A path that names no field throws a `TypeError`, so a typo shows up at once. `only` and `except` are read on every render, so they can change, and a field keeps what was typed while it is hidden.

## Typing the form

The definition is data, so TypeScript doesn't know its fields, and `jsonForm.form` is typed loosely: Formisch's own functions accept only top-level paths on it. Give `useJsonForm` your input type, and your output type when it differs, and they check paths and values as in any Formisch form:

```ts
import { getInput, useFieldArray } from '@formisch/react'

interface CheckoutInput {
  name: string
  address: { city: string }
  lines: { product: string; quantity: number }[]
}

const jsonForm = useJsonForm<CheckoutInput>(definition, { components })

getInput(jsonForm.form, { path: ['address', 'city'] }) // string | undefined
useFieldArray(jsonForm.form, { path: ['lines'] })
```

- Formisch's `<Field>`, `<FieldArray>`, `useField`, `getInput` and `setInput` work on `jsonForm.form` either way. With a type, nested paths type-check, their values are typed, and so is the output your submit handler gets.
- The type is a promise you make: nothing checks it against the definition. Keep the two in step.
- A field you render with Formisch's `<Field>` gets none of the adapter's help, like `setInput` turning `'5'` into `5`, or the defaults of a new array item. Leave it out of `<JsonFields>` with `except`.

## Not included

- Labels and display text reach your components as written in the definition. The builder's `resolveMessage` only changes what goes into the schema, so translate `field.label` in your components.
- `ui.widget` doesn't pick a component. A component can read `field.ui` itself, e.g. to show a multiselect as checkboxes.
- Showing and hiding fields, or making one required because of another, belongs to a future affects package. The layout already hides a section, a row or a step whose fields are all hidden, through `shownNodes` in the schema package.
