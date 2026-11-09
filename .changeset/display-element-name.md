---
'@whatsaaaa/form-builder-schema': patch
---

A display element with a `name` no longer takes the dot path of the field of that name. Its name is no key of the value, so it has its parent's `dataPath`, and `dotPathOf` gives undefined for it. Before, a heading named `email` next to an `email` field was what `findField(fields, 'email')` and `<JsonField path="email">` gave, `except: ['email']` left out both, and the adapters gave both the same key.
