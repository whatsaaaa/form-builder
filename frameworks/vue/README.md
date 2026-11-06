# @whatsaaaa/form-builder-vue

Render JSON form definitions with [Formisch](https://formisch.dev) and your own Vue components.

It's headless: it reads the definition, connects every field to Formisch and turns input into the values the schema expects, but it renders nothing of its own. You give it a component per field type, so it works with plain HTML, Nuxt UI or any other UI library.

## Install

```sh
pnpm add @whatsaaaa/form-builder-vue @formisch/vue valibot
```

Vue 3.5, `@formisch/vue` 1.1 and Valibot 1.3 or later are required. `@whatsaaaa/form-builder-schema` comes with it.

## Usage

```vue
<script setup lang="ts">
import { Form } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import { components } from './fields'

const { definition } = defineProps<{ definition: JsonForm }>()

const jsonForm = useJsonForm(definition, { components })

function save(output: unknown) {
  // The output of the schema: trimmed, numbers as numbers, empty optional fields left out.
}
</script>

<template>
  <Form :of="jsonForm.form" @submit="save">
    <JsonFields :of="jsonForm" />
    <button type="submit">Save</button>
  </Form>
</template>
```

- `useJsonForm(definition, options?)` builds the schema and the initial input, and creates the Formisch form. `jsonForm.form` is a normal Formisch form, so every Formisch method works on it.
- `<JsonFields>` renders the fields inside your `<Form>`. The form element, the submit button and anything around them are yours.
- A definition with issues throws the builder's `DefinitionError`. Run `validate()` first when the definition comes from outside your code.
- The definition is read once. To show another one, give the component that calls `useJsonForm` a new `:key`.

### Options

```ts
useJsonForm(definition, {
  builder: createSchemaBuilder({ fieldTypes: { money } }), // your own types, rules and messages
  components, // your component per field type, see below
  validate: 'blur', // when a field is validated the first time, as in Formisch
  revalidate: 'input', // when it is validated again
})
```

## Components

`components` has one component per field type, by type name. Pass it to `useJsonForm`, or to `<JsonFields>` and `<JsonField>` as a prop, which wins. Several types can share one:

```ts
import type { FieldComponents } from '@whatsaaaa/form-builder-vue'

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

A type that a definition uses but `components` doesn't have throws a `TypeError` that names every missing type, when `<JsonFields>` or `<JsonField>` sets up. Only the fields it renders count.

What a component gets depends on the field's role:

| Role    | Which fields                   | Props                                                                            | Slot                                         |
| ------- | ------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------------- |
| value   | every field with a value       | `field`, `path`, `kind`, `required`, `input`, `errors`, `inputProps`, `setInput` | —                                            |
| group   | a container of kind `object`   | `field`, `path`                                                                  | default: the group's fields                  |
| array   | a container of kind `array`    | `field`, `path`, `items`, `errors`, `add`, `remove`, `move`                      | default, with `{ index }`: one item's fields |
| display | a display element, kind `none` | `field`                                                                          | —                                            |

The props are typed as `ValueFieldProps`, `GroupFieldProps`, `ArrayFieldProps` and `DisplayFieldProps`, and the slots as `GroupFieldSlots` and `ArrayFieldSlots`. `defineProps<ValueFieldProps>()` works in `<script setup>`.

Your own container types render through the group or array role too, by their kind.

### A value field

```vue
<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'

defineProps<ValueFieldProps>()
</script>

<template>
  <label>
    {{ field.label }}
    <input
      v-bind="inputProps"
      :type="kind === 'number' ? 'number' : 'text'"
      :value="input ?? ''"
      :required="required"
      @input="setInput(($event.target as HTMLInputElement).value)"
    />
    <small v-if="errors">{{ errors[0] }}</small>
  </label>
</template>
```

- `field` is the field from the definition, with its `label`, `placeholder`, `options` and `ui`.
- `path` is its Formisch path with real indexes, like `['lines', 0, 'quantity']`.
- `inputProps` are Formisch's element props: the field's name, a ref, and focus, change and blur handlers. Bind them to the input element, so Formisch knows when the field is touched and can focus it after a failed submit.
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

### A group

```vue
<script setup lang="ts">
import type { GroupFieldProps, GroupFieldSlots } from '@whatsaaaa/form-builder-vue'

defineProps<GroupFieldProps>()
defineSlots<GroupFieldSlots>()
</script>

<template>
  <fieldset>
    <legend>{{ field.label }}</legend>
    <slot />
  </fieldset>
</template>
```

### An array

```vue
<script setup lang="ts">
import type { ArrayFieldProps, ArrayFieldSlots } from '@whatsaaaa/form-builder-vue'

defineProps<ArrayFieldProps>()
defineSlots<ArrayFieldSlots>()
</script>

<template>
  <fieldset>
    <legend>{{ field.label }}</legend>
    <div v-for="(item, index) in items" :key="item">
      <slot :index="index" />
      <button type="button" @click="remove(index)">Remove</button>
    </div>
    <button type="button" @click="add()">Add</button>
    <small v-if="errors">{{ errors[0] }}</small>
  </fieldset>
</template>
```

- `items` has one id per item. Use it as the `key`, so each item keeps its inputs when one is removed or moved.
- `add()` adds an item at the end, with the defaults its fields have in the definition.
- `errors` are the array's own messages, like a required array's or `maxLength`'s. Its items' fields show their own.

### A display element

```vue
<script setup lang="ts">
import type { DisplayFieldProps } from '@whatsaaaa/form-builder-vue'

defineProps<DisplayFieldProps>()
</script>

<template>
  <h2>{{ field.text }}</h2>
</template>
```

Declare the props even when a component doesn't use them, like a divider, or Vue adds `field` to its element as an attribute.

## Placing fields yourself

`<JsonFields>` renders every field in the order of the definition. To put some of them somewhere else, place them with `<JsonField>` and leave them out of `<JsonFields>` with `except`:

```vue
<template>
  <Form :of="jsonForm.form" @submit="save">
    <main>
      <JsonFields :of="jsonForm" :except="['coupon', 'acceptTerms']" />
    </main>
    <aside>
      <JsonField :of="jsonForm" path="coupon" />
      <JsonField :of="jsonForm" path="acceptTerms" />
      <button type="submit">Place order</button>
    </aside>
  </Form>
</template>
```

- A path is the field's names joined with dots: `'email'`, or `'address.city'` for a field of a group. A placed field validates, focuses and submits like any other, because it is still part of the one Formisch form.
- A group or an array comes with all its fields. A field of an array's items can't be placed on its own, because it has no index outside its item, so place the array. To leave such a field out of every item, use `'*'` for the index: `except: ['lines.*.note']`.
- `only` renders just the fields it names, in the order of the definition: `<JsonFields :of="jsonForm" :only="['name', 'email']" />`. Display elements have no name, so `only` leaves them out.
- A path that names no field throws a `TypeError`, so a typo shows up at once. `only` and `except` are read when the component sets up.

## Typing the form

The definition is data, so TypeScript doesn't know its fields, and `jsonForm.form` is typed loosely: Formisch's own functions accept only top-level paths on it. Give `useJsonForm` your input type, and your output type when it differs, and they check paths and values as in any Formisch form:

```ts
import { getInput, useFieldArray } from '@formisch/vue'

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
- Showing and hiding fields, or making one required because of another, belongs to a future affects package.
