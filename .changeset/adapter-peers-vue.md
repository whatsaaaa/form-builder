---
'@whatsaaaa/form-builder-vue': minor
---

`@whatsaaaa/form-builder-schema` is a peer dependency now, not a dependency, so the adapter uses the copy your app installs instead of a second one of its own. With two copies, a builder from your `createSchemaBuilder()` threw in `useJsonForm`, and `instanceof DefinitionError` was `false` for the adapter's errors. The other peers now ask for what the adapter needs: Valibot 1.4.1 or later, like every `@formisch/vue` 1.x, and Vue 3.5.2 or later, the first Vue its published types check with when `skipLibCheck` is off.
