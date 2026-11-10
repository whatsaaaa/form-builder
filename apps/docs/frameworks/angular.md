---
description: A tested renderer for form definitions in Angular, with @formisch/angular and the schema package.
---

# Angular

Angular needs no adapter: you use the schema package with `@formisch/angular`, Formisch's own package for Angular. Below is a whole renderer to start from, with layouts, steps, conditions and a native control for every built-in type. Copy it into your app and make it yours.

## Installation

::: code-group

```sh [npm]
npm install @whatsaaaa/form-builder-schema @whatsaaaa/form-builder-affects @formisch/angular valibot
```

```sh [pnpm]
pnpm add @whatsaaaa/form-builder-schema @whatsaaaa/form-builder-affects @formisch/angular valibot
```

```sh [yarn]
yarn add @whatsaaaa/form-builder-schema @whatsaaaa/form-builder-affects @formisch/angular valibot
```

```sh [bun]
bun add @whatsaaaa/form-builder-schema @whatsaaaa/form-builder-affects @formisch/angular valibot
```

:::

The affects package is only needed for [conditions](/guide/conditions). Without it, make the builder with `createSchemaBuilder()` alone: the renderer then hides nothing, and needs no other change.

## How it works

It has the parts every renderer has, described in [rendering with Formisch](/frameworks/formisch):

- **`JsonFormView`** reads the definition once: the schema and initial input for Formisch's form, the layout's steps, and what the conditions hide. It renders the current step, Back and Next while there are steps, and Save on the last one.
- **`Layout`** renders each node of a step by its type: a section as a `<fieldset>`, a row as a 12-column grid whose cells take their `span`, a slot with the content you pass, and a field by its role.
- **`ArrayField`** renders Formisch's field array, the layout of each item, and buttons to add and remove items.
- **`ValueField`** connects a field to Formisch at its path, picks the native control by the field's type, and sets what the element gives through `coerceInput`.

What is particular to Angular:

- `injectForm` needs an injection context, and the definition is an input, which is set by `ngOnInit`. So `ngOnInit` makes the form in the component's injector.
- Pass the path to `injectField` and `injectFieldArray` as a signal, so a field follows its item when one before it is removed.
- `[formischControl]` reads and writes the element when the element holds the field's value: text, a checkbox, files. A number, and an option's own value, are set with `field.setInput` instead, with the field's name bound to the element.
- The content of a slot is an `<ng-template>`: pass the `TemplateRef`s in `slots`, and `ngTemplateOutlet` renders each where the layout puts it.
- A new Angular app turns on `noPropertyAccessFromIndexSignature`, so the props of a field's type, which `JsonField` doesn't name, are read with brackets: `node.field['text']`, `field.ui?.['widget']`.

The renderer is tested: the [integration tests](https://github.com/whatsaaaa/form-builder/tree/main/integration/examples) run every shared fixture through it, from a text field to lists, form rules, layouts with steps, and conditions. They type, tick, pick, step and submit like a person, and check the fields on show, the errors and what the form submits.

## The renderer

<<< ../../../integration/examples/angular/json-form-view.ts

## Making it yours

- The `data-error`, `data-add`, `data-remove`, `data-next`, `data-back` and `data-span` attributes only mark elements for the tests. Leave them out.
- A row's grid has 12 columns at every width here. On a narrow screen, give each cell the whole row with a media query.
- The Vue and React adapters also restore a step's errors when the user comes back to it, revalidate a step that failed Next as the user fixes it, and treat a submit before the last step as Next. See [multi-step forms](/frameworks/multi-step-forms) for the behavior to copy.
