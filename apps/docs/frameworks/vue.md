---
description: Render form definitions in Vue with useJsonForm, JsonFields and your own components.
---

# Vue

The Vue adapter renders definitions with Formisch and your own components. It reads the definition, connects every field to Formisch and turns input into the values the schema expects, but renders nothing of its own. Below you will learn how to set it up.

## Installation

::: code-group

```sh [npm]
npm install @whatsaaaa/form-builder-vue @whatsaaaa/form-builder-schema @formisch/vue valibot
```

```sh [pnpm]
pnpm add @whatsaaaa/form-builder-vue @whatsaaaa/form-builder-schema @formisch/vue valibot
```

```sh [yarn]
yarn add @whatsaaaa/form-builder-vue @whatsaaaa/form-builder-schema @formisch/vue valibot
```

```sh [bun]
bun add @whatsaaaa/form-builder-vue @whatsaaaa/form-builder-schema @formisch/vue valibot
```

:::

Vue 3.5, `@formisch/vue` 1.1 and Valibot 1.3 or later are required.

## Usage

[`useJsonForm`](/api/vue/useJsonForm) builds the schema and the initial input, and creates the Formisch form. [`<JsonFields>`](/api/vue/JsonFields) renders its fields inside Formisch's `<Form>`, each with your component for its type:

<<< @/snippets/vue/SignUpForm.vue

- `jsonForm.form` is a normal Formisch form, so every Formisch method works on it, like `reset` and `setInput`.
- The form element, the submit button and anything around them are yours.
- A definition with issues throws the builder's `DefinitionError`. Run [`validate()`](/guide/checking-definitions) first when the definition comes from outside your code.
- The definition is read once, when the component sets up. To show another one, give the component that calls `useJsonForm` a new `:key`.

## Options

`useJsonForm` takes the builder, your components, and Formisch's validation modes:

<<< @/snippets/vue/options.ts#options

Pass a builder when your definitions use your own types, rules or messages, or the [conditions](/guide/conditions) of the affects package. `components` and `layoutComponents` can also go to `<JsonFields>` and `<JsonField>` as props, which win over the options.

## Not included

- Labels and display text reach your components as written in the definition. The builder's `resolveMessage` only changes what goes into the schema, so translate `field.label` in your components.
- `ui.widget` doesn't pick a component. A component can read `field.ui` itself, like a multiselect that shows checkboxes.

## Next steps

Continue to [field components](/frameworks/field-components) to write a component for every field type.
