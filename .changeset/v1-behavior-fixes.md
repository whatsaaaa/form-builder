---
'@whatsaaaa/form-builder-schema': minor
---

A required field whose key is missing from the input now reports its required message, the same as one whose value is `undefined`, instead of Valibot's generic `Invalid key: Expected "email" but received undefined`. This matters for input that doesn't come from Formisch, like a request to your server that leaves a key out. Every other issue of an object schema still gets Valibot's message: the one set for `v.object`, for schemas or globally, else its own. The schema's type and what Formisch and JSON Schema converters read don't change.

Form rules now report the same in any order. Each one skips only when a field it reads has an issue of its own, never because of another form rule's issue. Before, a rule after `sameAs` on `b` skipped `b`, but one before it didn't. The form rules now run in one check in the schema's pipe, instead of one check each.
