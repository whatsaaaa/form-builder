---
'@whatsaaaa/form-builder-react': minor
---

`@whatsaaaa/form-builder-schema` is a peer dependency now, not a dependency, so the adapter uses the copy your app installs instead of a second one of its own. With two copies, a builder from your `createSchemaBuilder()` threw in `useJsonForm`, and `instanceof DefinitionError` was `false` for the adapter's errors.
