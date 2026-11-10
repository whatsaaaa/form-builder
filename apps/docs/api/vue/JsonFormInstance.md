---
description: 'What useJsonForm returns in Vue: the Formisch form, the layout, the steps and the visibility.'
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

### Explanation

`AnyJsonFormInstance` is any form `useJsonForm` returns, typed or not: what the components take.

## Related

### Types

- [JsonFormSteps](/api/vue/JsonFormSteps)
- [Visibility](/api/schema/Visibility)
