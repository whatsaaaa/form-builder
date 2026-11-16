---
description: 'What useJsonForm returns in Vue: the Formisch form, the layout, the steps, the visibility and the pending fills.'
---

# JsonFormInstance

What [`useJsonForm`](/api/vue/useJsonForm) returns. Pass it to `<JsonFields>` and `<JsonField>`.

## Generics

- `TSchema` <code>extends FormSchema</code>

## Definition

- `JsonFormInstance`
  - `form` <code>FormStore&lt;TSchema&gt;</code>: the Formisch form, for Formisch's `<Form>` and every Formisch method
  - `definition` <code>[JsonForm](/api/schema/JsonForm)</code>
  - `builder` <code>[SchemaBuilder](/api/schema/SchemaBuilder)</code>
  - `components` <code>[FieldComponents](/api/vue/FieldComponents) | undefined</code>
  - `layoutComponents` <code>[LayoutComponents](/api/vue/LayoutComponents) | undefined</code>
  - `fields` <code>readonly [FieldNode](/api/schema/FieldNode)[]</code>: the definition's fields as a tree
  - `layout` <code>[FormLayout](/api/schema/FormLayout)</code>: the definition's layout
  - `steps` <code>[JsonFormSteps](/api/vue/JsonFormSteps)</code>: the current step, and Next, Back and Go to
  - `visibility` <code>[VisibilityState](/api/schema/Visibility#visibilitystate)</code>: what the conditions hide for the form's input now
  - `fills` <code>[FillsState](/api/schema/FillsState)</code>: what the fills are waiting for now. Without fills, nothing is pending
  - `reset` <code>(config?: ResetFormConfig&lt;TSchema&gt;) =&gt; void</code>: resets the whole form, like Formisch's `reset` with the same options, and starts the fills again

### Explanation

`AnyJsonFormInstance` is any form `useJsonForm` returns, typed or not: what the components take.

`visibility` and `fills` are reactive: a template or a `computed` that reads them updates when they change. `fills.pending` lists the trigger of each fill that waits for its values, so disable the submit button while it isn't empty. See [fills](/frameworks/vue#fills).

Reset a form with `reset()` rather than Formisch's own `reset`: it starts the fills again, as when the form was mounted, so a field that starts from its `default` fills in the others again, and the next value of a field with `fills` sets every field the user hasn't edited since. Formisch's `reset` leaves the fills comparing the fields with what the last fill set. An `initialInput` goes over the definition's defaults, like [`useJsonForm`'s](/api/vue/UseJsonFormOptions#initial-input), and a record in it is left as it is.

## Related

### Types

- [JsonFormSteps](/api/vue/JsonFormSteps)
- [Visibility](/api/schema/Visibility)
- [FillsState](/api/schema/FillsState)
