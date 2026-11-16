---
description: 'What useJsonForm returns in React: the Formisch form, the layout, the steps, the visibility and the pending fills.'
---

# JsonFormInstance

What [`useJsonForm`](/api/react/useJsonForm) returns. Pass it to `<JsonFields>` and `<JsonField>`.

## Generics

- `TSchema` <code>extends FormSchema</code>

## Definition

- `JsonFormInstance`
  - `form` <code>FormStore&lt;TSchema&gt;</code>: the Formisch form, for Formisch's `<Form>` and every Formisch method
  - `definition` <code>[JsonForm](/api/schema/JsonForm)</code>
  - `builder` <code>[SchemaBuilder](/api/schema/SchemaBuilder)</code>
  - `components` <code>[FieldComponents](/api/react/FieldComponents) | undefined</code>
  - `layoutComponents` <code>[LayoutComponents](/api/react/LayoutComponents) | undefined</code>
  - `fields` <code>readonly [FieldNode](/api/schema/FieldNode)[]</code>: the definition's fields as a tree
  - `layout` <code>[FormLayout](/api/schema/FormLayout)</code>: the definition's layout
  - `steps` <code>[JsonFormSteps](/api/react/JsonFormSteps)</code>: the current step, and Next, Back and Go to
  - `visibility` <code>[VisibilityState](/api/schema/Visibility#visibilitystate)</code>: what the conditions hide for the form's input now
  - `fills` <code>[FillsState](/api/schema/FillsState)</code>: what the definition's fills are waiting for now

### Explanation

`AnyJsonFormInstance` is any form `useJsonForm` returns, typed or not: what the components take. `visibility` is a new object only when what is hidden changes, so the form re-renders for that, not for every keystroke.

`fills.pending` lists the triggers whose fill waits for its values, like from a source, and `fills.isPending(path)` tells it for any field: its trigger, or a field it sets. It is a new object only when that changes. Without fills, nothing is pending. Disable the submit button while `fills.pending` isn't empty: see [fills](/frameworks/react#fills).

## Related

### Types

- [JsonFormSteps](/api/react/JsonFormSteps)
- [Visibility](/api/schema/Visibility)
- [FillsState](/api/schema/FillsState)
