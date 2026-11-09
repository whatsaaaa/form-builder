---
'@whatsaaaa/form-builder-schema': minor
---

Extensions: `createSchemaBuilder({ extensions: [...] })` takes features from other packages that read keys of their own on fields, steps and sections, like the `affects` of `@whatsaaaa/form-builder-affects`. Without the extension, its keys are unknown keys, as before. With conditions, the schema skips the validation of hidden fields and the form rules that read them, in every Formisch package and in `v.parse`, and `getInitialInput` leaves out the defaults of fields that start cleared. `builder.getVisibility(json)` tells renderers what is hidden for an input, `defineExtension` makes an extension, and `toJsonSchema` takes the extensions' keys. Two new issue codes: `invalid_value` and `cycle`. `FieldNode`, and the layout's steps, sections and rows, get their `definitionPath`. A definition without conditions builds the schema it always did, and a builder without extensions doesn't bundle the code that runs them.

The hint for a form rule path with an index, like `lines.0.qty`, now reads `lines.*.qty`, not `lines.*.0.qty`.
