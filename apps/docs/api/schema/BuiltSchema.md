---
description: The type of the schema build() gives.
---

# BuiltSchema

The type of the schema [`build()`](/api/schema/SchemaBuilder#build) gives: the object schema of the fields, in a pipe with one check that runs every form rule when the definition has form rules.

```ts
type BuiltSchema =
  | FieldsSchema
  | SchemaWithPipe<readonly [FieldsSchema, ...FormRuleAction[]]>
```

## Explanation

Its input and output are objects of `unknown` values. A new object made from its `entries` leaves the form rules out, and the conditions of extensions. To type the values, see [`TypedBuiltSchema`](/api/schema/TypedBuiltSchema).

## FieldsSchema

The schema of a list of fields: an object with a key for each field that has a value.

```ts
type FieldsSchema = ObjectSchema<ObjectEntries, undefined>
```

## FormRuleAction

The check of one form rule, on the value of the whole form. To keep the form rules on a new object made from the `entries`, pipe it with these from `schema.pipe`.

```ts
type FormRuleAction = RawCheckAction<Record<string, unknown>>
```

## Related

### Types

- [TypedBuiltSchema](/api/schema/TypedBuiltSchema)

### Guides

- [Form rules](/guide/form-rules#in-the-schema)
