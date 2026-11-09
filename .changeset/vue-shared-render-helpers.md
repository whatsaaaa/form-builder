---
'@whatsaaaa/form-builder-vue': patch
---

The adapter now uses the render helpers of `@whatsaaaa/form-builder-schema`, so it behaves as before, and renderers for other frameworks share its code. `FieldNode`, `FieldRole`, `FieldPath`, `JsonFormSchema` and `TypedJsonFormSchema` are the schema package's types, exported from here as before.
