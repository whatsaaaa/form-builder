---
description: 'A field type: its kind, props, schema and hooks.'
---

# FieldTypeDef

A field type, as [`defineFieldType`](/api/schema/defineFieldType) takes it.

## Generics

- `TProps` <code>extends [AnyObjectSchema](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema)</code>

## Definition

- `FieldTypeDef`
  - `kind` <code>[ValueKind](/api/schema/ValueKind) | [KindOf](/api/schema/FieldTypeDef#kindof)</code>: the kind of its value, or a function of the field with its props parsed
  - `itemKind` <code>[ValueKind](/api/schema/ValueKind) | [KindOf](/api/schema/FieldTypeDef#kindof)</code>: optional, the kind of each item for kind `array`
  - `props` <code>TProps</code>: optional, the extra keys it takes
  - `schema` <code>(field: [FieldWithProps](/api/schema/FieldTypeDef#fieldwithprops), ctx: [BuildContext](/api/schema/FieldTypeDef#buildcontext)) =&gt; [AnySchema](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema)</code>: the schema of its value. Required unless its kind is `none`
  - `defaultRules` <code>readonly [JsonRule](/api/schema/JsonRule)[]</code>: optional, rules every field of the type gets
  - `required` <code>(message: string) =&gt; [AnyAction](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema) | null</code>: optional, replaces the kind's required check
  - `finalize` <code>(field: [FieldWithProps](/api/schema/FieldTypeDef#fieldwithprops)) =&gt; [AnyAction](/api/schema/FieldTypeDef#anyschema-anyaction-anyobjectschema) | undefined</code>: optional, runs after every rule
  - `container` <code>boolean</code>: optional, true for a type whose value holds other fields
  - `meta` <code>[FieldTypeMeta](/api/schema/FieldTypeDef#fieldtypemeta)</code>: optional

### Explanation

See [custom field types](/guide/custom-field-types).

## FieldTypeMeta

- `FieldTypeMeta`
  - `label` `string`
  - `description` `string`: optional

## FieldWithProps

```ts
type FieldWithProps<TProps> = JsonField & InferOutput<TProps>
```

A field with its type's props parsed and typed.

## KindOf

A `kind` or `itemKind` that depends on the props: a select with number options has kind `number`.

```ts
type KindOf<TProps> = (field: FieldWithProps<TProps>) => ValueKind
```

## BuildContext

- `BuildContext`
  - `path` `DefinitionPath`: where the field is in the definition
  - `buildFields` `(fields: readonly JsonField[], path: DefinitionPath) => AnyObjectSchema`: checks and builds child fields
  - `buildField` `(field: JsonField, path: DefinitionPath) => AnySchema`: checks and builds the field of a list's items

## AnySchema, AnyAction, AnyObjectSchema

The Valibot schema and action types a field type works with: any schema, any action, and any object schema.

## Related

### Functions

- [defineFieldType](/api/schema/defineFieldType)
- [createBuildContext](/api/schema/createBuildContext)
