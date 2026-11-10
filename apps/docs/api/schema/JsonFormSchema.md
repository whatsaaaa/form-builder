---
description: The type of the schema build() gives.
---

# JsonFormSchema

The type of the schema [`build()`](/api/schema/SchemaBuilder#build) gives: the object schema of the fields, in a pipe with one check that runs every form rule when the definition has form rules.

```ts
type JsonFormSchema =
  | ObjectSchema<ObjectEntries, undefined>
  | SchemaWithPipe<
      readonly [ObjectSchema<ObjectEntries, undefined>, ...FormRuleAction[]]
    >
```

## Explanation

Its input and output are objects of `unknown` values. A new object made from its `entries` leaves the form rules out, and the conditions of extensions. To type the values, see [`TypedJsonFormSchema`](/api/schema/TypedJsonFormSchema).

## Related

### Types

- [TypedJsonFormSchema](/api/schema/TypedJsonFormSchema)

### Guides

- [Form rules](/guide/form-rules#in-the-schema)
