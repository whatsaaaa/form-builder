---
description: Defines a field type of your own, with its kind, props and schema.
---

# defineFieldType

Defines a field type. It returns the type unchanged, typed so that `schema()` and `kind` get the field with its props parsed.

```ts
const type = defineFieldType<TProps>(def)
```

## Generics

- `TProps` <code>extends [AnyObjectSchema](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema)</code>

## Parameters

- `def` <code>[FieldTypeDef](/api/schema/FieldTypeDef)&lt;TProps&gt;</code>

### Explanation

Register the type with [`createSchemaBuilder`](/api/schema/createSchemaBuilder)'s `fieldTypes` option, under the name definitions use in `type`.

## Returns

- `type` <code>[FieldTypeDef](/api/schema/FieldTypeDef)&lt;TProps&gt;</code>

## Example

<<< @/snippets/schema/custom-field-types.ts#tags

## Related

### Guides

- [Custom field types](/guide/custom-field-types)

### Types

- [FieldTypeDef](/api/schema/FieldTypeDef)
