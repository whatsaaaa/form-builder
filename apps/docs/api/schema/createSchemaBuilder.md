---
description: Creates a schema builder, which checks definitions and builds their Valibot schemas.
---

# createSchemaBuilder

Creates a schema builder. It checks definitions, builds their Valibot schemas, and gives renderers the initial input, the layout and what is hidden.

```ts
const builder = createSchemaBuilder(options)
```

## Parameters

- `options` <code>[SchemaBuilderOptions](/api/schema/SchemaBuilderOptions)</code>: optional

### Explanation

Without options, the builder has every built-in kind, field type, rule and form rule. Your own entries merge over them by name, so an entry with a built-in name replaces it. `includeDefaultRules: false` leaves out the built-in rules and form rules, for [registering only some](/guide/rules#registering-only-some-rules).

The builder keeps the names of your entries in its type, so [`defineForm()`](/api/schema/SchemaBuilder#defineform) knows every type, rule and form rule by name, and the keys your extensions add.

Mistakes in the registries, like an unknown kind, a reserved key in a type's props, or a built-in type whose rule you left out, throw a `TypeError` at once. Use one builder for everything a form does, so your own entries count everywhere.

## Returns

- `builder` <code>[SchemaBuilder](/api/schema/SchemaBuilder)</code>

## Example

<<< @/snippets/schema/introduction.ts

## Related

### Guides

- [Getting started](/guide/getting-started)
- [Custom field types](/guide/custom-field-types)
- [Custom rules](/guide/custom-rules)
- [Messages and i18n](/guide/messages)

### Types

- [SchemaBuilder](/api/schema/SchemaBuilder)
- [SchemaBuilderOptions](/api/schema/SchemaBuilderOptions)
