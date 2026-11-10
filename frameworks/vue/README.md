# @whatsaaaa/form-builder-vue

Render JSON form definitions with [Formisch](https://formisch.dev) and your own Vue components.

[![npm version](https://img.shields.io/npm/v/@whatsaaaa/form-builder-vue)](https://www.npmjs.com/package/@whatsaaaa/form-builder-vue)
[![npm downloads](https://img.shields.io/npm/dm/@whatsaaaa/form-builder-vue)](https://www.npmjs.com/package/@whatsaaaa/form-builder-vue)
[![CI](https://img.shields.io/github/actions/workflow/status/whatsaaaa/form-builder/ci.yml?branch=main&label=CI)](https://github.com/whatsaaaa/form-builder/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/whatsaaaa/form-builder/graph/badge.svg?flag=vue)](https://codecov.io/gh/whatsaaaa/form-builder)
[![Vue](https://img.shields.io/npm/dependency-version/@whatsaaaa/form-builder-vue/peer/vue?logo=vuedotjs)](https://vuejs.org)
[![Types](https://img.shields.io/npm/types/@whatsaaaa/form-builder-vue)](https://www.npmjs.com/package/@whatsaaaa/form-builder-vue)
[![License](https://img.shields.io/npm/l/@whatsaaaa/form-builder-vue)](https://github.com/whatsaaaa/form-builder/blob/main/LICENSE)

This is the Vue adapter of [form-builder](https://github.com/whatsaaaa/form-builder). It is headless: it reads the definition, connects every field to Formisch and turns input into the values the schema expects, but renders nothing of its own. You give it a component per field type, so it works with plain HTML, Nuxt UI or any other UI library.

## Install

```sh
pnpm add @whatsaaaa/form-builder-vue @formisch/vue valibot
```

Vue 3.5, `@formisch/vue` 1.1 and Valibot 1.3 or later are required. `@whatsaaaa/form-builder-schema` comes with it.

## Example

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

`components` maps each field type to a component of yours. A text input looks like this:

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

`jsonForm.form` is a normal Formisch form, so every Formisch method works on it.

## Highlights

- Headless: one component of yours per field type, and per layout type
- `setInput` turns what an element gives into the value the schema expects
- Groups, arrays and display elements, with stable keys for array items
- Sections, 12-column rows, slots and multi-step forms from the definition's layout
- Steps that validate on Next and only show errors the user has seen
- Conditions from the affects package, with hidden steps skipped by Next and Back
- Fields placed in your own markup with `<JsonField>`, `only` and `except`

## Documentation

The [guide](https://github.com/whatsaaaa/form-builder/blob/main/frameworks/vue/docs/guide.md) covers options, components for every role, layout, steps, conditions, placing fields yourself and typing the form.

## Related packages

- [`@whatsaaaa/form-builder-schema`](https://github.com/whatsaaaa/form-builder/tree/main/packages/schema): build Formisch-ready Valibot schemas from JSON definitions
- [`@whatsaaaa/form-builder-affects`](https://github.com/whatsaaaa/form-builder/tree/main/packages/affects): show, hide and clear fields by conditions
- [`@whatsaaaa/form-builder-react`](https://github.com/whatsaaaa/form-builder/tree/main/frameworks/react): the same adapter for React

## License

[MIT](https://github.com/whatsaaaa/form-builder/blob/main/LICENSE)
