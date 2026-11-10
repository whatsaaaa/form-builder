---
description: 'The options of useJsonForm in Vue: the builder, your components and the validation modes.'
---

# UseJsonFormOptions

The options of [`useJsonForm`](/api/vue/useJsonForm).

## Definition

- `UseJsonFormOptions`
  - `builder` <code>[SchemaBuilder](/api/schema/SchemaBuilder)</code>: optional, builds the schema and knows your own types and rules. Defaults to `createSchemaBuilder()`
  - `components` <code>[FieldComponents](/api/vue/FieldComponents)</code>: optional, your component for each field type
  - `layoutComponents` <code>[LayoutComponents](/api/vue/LayoutComponents)</code>: optional, your component for each layout type
  - `validate` <code>ValidationMode</code>: optional, when a field is validated the first time, as in Formisch
  - `revalidate` <code>Exclude&lt;ValidationMode, 'initial'&gt;</code>: optional, when it is validated again, as in Formisch

## Example

<<< @/snippets/vue/options.ts#options

## Related

### Composables

- [useJsonForm](/api/vue/useJsonForm)
