---
'@whatsaaaa/form-builder-schema': minor
---

Groups, arrays and initial input. Groups and arrays are ordinary field types, so the 0.4 API is unchanged.

**New field types:** `group` nests its `fields` under its name, and `array` is a list: of single values with `of`, or of objects with `fields`.

```json
{
  "name": "lines",
  "type": "array",
  "required": true,
  "fields": [{ "name": "product", "type": "text" }]
}
```

- A group is always there, so it can't have `required` or `default`. A required array needs at least one item, and rules like `minLength` count its items.
- Issues in nested fields have their full path, such as `fields[2].fields[0].rules[1]`. Duplicate names are checked among the fields next to each other only.

**New functions:** `getInitialInput(definition)` gives Formisch's `initialInput`, built from the defaults. `walkFields(definition)` yields every field at every depth, with its data path and definition path. Neither needs a builder.

**For your own field types:**

- `ctx.buildFields(fields, path)` and `ctx.buildField(field, path)` build child fields with the same registries, and their issues land in the same result. A type whose value holds them sets `container: true`.
- `createBuildContext(overrides?)` makes a context for testing a field type on its own.

**Definitions that may need a fix:** two new checks report what 0.4 let through. A name with `.`, `[` or `]` is now `invalid_name`, and a `default` that fails its field's schema is now `invalid_default`.
