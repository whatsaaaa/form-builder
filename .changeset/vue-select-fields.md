---
'@whatsaaaa/form-builder-vue': patch
---

`only`, `except` and the check for missing components now use the schema package's `selectFields` and `checkComponents`, which the React adapter shares. They behave as before.

`<JsonFields>` with `only` no longer gives two fields the same key when they share a name at different depths, like `email` and `billing.email`.
