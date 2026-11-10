---
description: A tested renderer for form definitions in Solid, with @formisch/solid and the schema package.
---

# Solid

Solid needs no adapter: you use the schema package with `@formisch/solid`, Formisch's own package for Solid. Below is a whole renderer to start from, with layouts, steps, conditions and a native control for every built-in type. Copy it into your app and make it yours.

## Installation

::: code-group

```sh [npm]
npm install @whatsaaaa/form-builder-schema @whatsaaaa/form-builder-affects @formisch/solid valibot
```

```sh [pnpm]
pnpm add @whatsaaaa/form-builder-schema @whatsaaaa/form-builder-affects @formisch/solid valibot
```

```sh [yarn]
yarn add @whatsaaaa/form-builder-schema @whatsaaaa/form-builder-affects @formisch/solid valibot
```

```sh [bun]
bun add @whatsaaaa/form-builder-schema @whatsaaaa/form-builder-affects @formisch/solid valibot
```

:::

The affects package is only needed for [conditions](/guide/conditions). Without it, make the builder with `createSchemaBuilder()` alone: the renderer then hides nothing, and needs no other change.

## How it works

It has the parts every renderer has, described in [rendering with Formisch](/frameworks/formisch):

- **`JsonFormView`** reads the definition once: the schema and initial input for Formisch's form, the layout's steps, and what the conditions hide. It renders the current step, Back and Next while there are steps, and Save on the last one.
- **`Layout`** renders each node of a step by its type: a section as a `<fieldset>`, a row as a 12-column grid whose cells take their `span`, a slot with the content you pass, and a field by its role.
- **`ArrayField`** renders Formisch's field array, the layout of each item, and buttons to add and remove items.
- **`ValueField`** connects a field to Formisch at its path, picks the native control by the field's type, and sets what the element gives through `coerceInput`.

What is particular to Solid:

- `createForm` makes the form. A component runs once, so it reads the definition once.
- Pass the path to `useField` and `useFieldArray` as a getter, so a field follows its item when one before it is removed.
- A field keeps its type, so the control is picked once, when the field renders. Its state is read in JSX, where Solid tracks it.
- `<For>` keeps an element for each object of its list, and `shownNodes` gives new objects for the sections and rows whose fields show or hide. So `Layout` renders the nodes as written, each in a `<Show>` while `shownNodes` has its key, and a field keeps its element, and its focus, as the fields around it show and hide.

The renderer is tested: the [integration tests](https://github.com/whatsaaaa/form-builder/tree/main/integration/examples) run every shared fixture through it, from a text field to lists, form rules, layouts with steps, and conditions. They type, tick, pick, step and submit like a person, and check the fields on show, the errors and what the form submits.

## The renderer

<<< ../../../integration/examples/solid/json-form-view.tsx

## Making it yours

- The `data-error`, `data-add`, `data-remove`, `data-next`, `data-back` and `data-span` attributes only mark elements for the tests. Leave them out.
- A row's grid has 12 columns at every width here. On a narrow screen, give each cell the whole row with a media query.
- The Vue and React adapters also restore a step's errors when the user comes back to it, revalidate a step that failed Next as the user fixes it, and treat a submit before the last step as Next. See [multi-step forms](/frameworks/multi-step-forms) for the behavior to copy.
