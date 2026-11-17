---
description: Render form definitions in React with useJsonForm, JsonFields and your own components.
---

# React

The React adapter renders definitions with Formisch and your own components. It reads the definition, connects every field to Formisch and turns input into the values the schema expects, but renders nothing of its own. Below you will learn how to set it up.

## Installation

::: code-group

```sh [npm]
npm install @whatsaaaa/form-builder-react @whatsaaaa/form-builder-schema @formisch/react valibot
```

```sh [pnpm]
pnpm add @whatsaaaa/form-builder-react @whatsaaaa/form-builder-schema @formisch/react valibot
```

```sh [yarn]
yarn add @whatsaaaa/form-builder-react @whatsaaaa/form-builder-schema @formisch/react valibot
```

```sh [bun]
bun add @whatsaaaa/form-builder-react @whatsaaaa/form-builder-schema @formisch/react valibot
```

:::

React 18 or 19, `@formisch/react` 1.2 and Valibot 1.4.1 or later are required. `@whatsaaaa/form-builder-schema` is a peer dependency, so install it too: the adapter and your code share its one copy, with the `createSchemaBuilder` and types your code imports.

## Usage

[`useJsonForm`](/api/react/useJsonForm) builds the schema and the initial input, and creates the Formisch form. [`<JsonFields>`](/api/react/JsonFields) renders its fields inside Formisch's `<Form>`, each with your component for its type:

<<< @/snippets/react/SignUpForm.tsx

- `jsonForm.form` is a normal Formisch form, so every Formisch method works on it, like `setInput`. Reset it with `jsonForm.reset()`, which takes the options of Formisch's `reset` for the whole form but `keepInput`, and starts the [fills](#fills) again. Its `initialInput` goes over the definition's defaults, like [the option's](#initial-input), and the form goes back to its first step, with no errors kept from the steps the user left.
- The form element, the submit button and anything around them are yours.
- A definition with issues throws the builder's `DefinitionError` while rendering, so an error boundary can catch it. Run [`validate()`](/guide/checking-definitions) first when the definition comes from outside your code.
- Like Formisch's `useForm`, `useJsonForm` reads the definition on the first render. To show another one, give the component that calls it a new `key`: `<SignUpForm key={id} definition={definition} />`. That makes a new form, without what the user typed: pass [`initialInput`](#initial-input) to start it with values.

## Options

`useJsonForm` takes the builder, the values the form starts with, your components, Formisch's validation modes, and what to do with the errors of fills:

<<< @/snippets/react/options.ts#options

`builder`, `initialInput`, `validate` and `revalidate` are read on the first render, with the definition, so make the builder once, outside the component. `components`, `layoutComponents` and `onFillError` are read on every render. The components can also go to `<JsonFields>` and `<JsonField>` as props, which win over the options.

Pass a builder when your definitions use your own types, rules or messages, the [conditions](/guide/conditions) of the affects package, or the [fills](#fills) of the fills package.

## Initial input

A form starts with the defaults of its definition. To start it with other values, like a record to edit, pass them as `initialInput`:

<<< @/snippets/react/EditCustomer.tsx

- **It goes over the defaults.** A field it has no key for keeps its `default`, in groups and in the items of lists too. A key that is there wins, so `undefined` starts a field blank.
- **It is read once**, with the definition. To edit another record, give the component a new `key`, like the record's id.
- **It is the form's initial input**, so `jsonForm.reset()` goes back to it, and `isDirty` compares with it.
- **It keeps what the user typed** when you build the form again, like for [another language](/guide/messages#changing-the-language): pass the old form's input.

[`UseJsonFormOptions`](/api/react/UseJsonFormOptions#initial-input) has every rule: groups, lists, conditions and the types.

## Fills

With [`fills()`](/api/fills/fills) in the builder, choosing a value of a field fills in others: picking a profile sets the first and last name. `useJsonForm` runs the fills of the definition, so your part is the sources, what to show while one loads, and its errors:

<<< @/snippets/react/ProfileForm.tsx

- **A fill runs on each new value of its trigger**, from the user or from code, and sets the fields the user hasn't changed since the last fill, or every one with `"overwrite": "always"`. A trigger that loses its value blanks every field its fill sets.
- **As the form starts**, a fill runs only for a trigger that starts from its default. A trigger that `initialInput` has a key for, like a saved record, fills nothing, and a fill never sets a field it has a key for then. The values of a map are in the initial input, on the first render. Those of a source come once the form is mounted, as values the form starts with, so it isn't dirty and `jsonForm.reset()` goes back to them.
- **`jsonForm.reset()` starts the fills again**, as when the form was mounted. It aborts the calls of the sources, a trigger that starts from its default fills in the others again, and the next value the user picks sets every field they haven't edited since. A record in its `initialInput` is left as it is, like one in the option. Formisch's own `reset` leaves the fills comparing the fields with what the last fill set, so a value it restores counts as the user's edit, and isn't filled. To clear the touched state and the errors but keep the input, call Formisch's `reset` with `keepInput`: the input stays, and so does what the fills know of the user's edits.
- **`jsonForm.fills`** says what waits for a source: `pending` lists the triggers, and `isPending(path)` tells it for any field. It is a new object only when that changes. Each field component gets it as its [`pending`](/frameworks/field-components#value-fields) prop, like the text input there shows.
- **Submitting while a fill waits is yours to handle**: disable the submit button while `fills.pending` isn't empty, as above. With [steps](/frameworks/multi-step-forms), Next waits for the pending fills before it validates.
- **`onFillError`** gets what a source threw, or a `TypeError` for a value its field can't hold, with the trigger and its value. Without it, the error is thrown like an uncaught one, so it shows in the console.
- **The newest value wins.** A new value of the trigger aborts the call before it through its `signal`, and so does unmounting the form. In development, StrictMode mounts the form twice, so a source the form starts with is called twice, and the first call is aborted.

[Fills](/guide/fills) has the syntax, the sources, and every rule of when a fill runs and what it sets.

## Not included

- Labels and display text reach your components as written in the definition. The builder's `resolveMessage` only changes what goes into the schema, so translate `field.label` in your components.
- `ui.widget` doesn't pick a component. A component can read `field.ui` itself, like a multiselect that shows checkboxes.

## Next steps

Continue to [field components](/frameworks/field-components) to write a component for every field type.
