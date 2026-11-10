---
description: 'The extension that adds conditions to definitions: affects on fields, steps and sections.'
---

# affects

Creates the extension that adds `affects` to definitions: a list of effects on fields, steps and sections, each with the condition that applies it.

```ts
const extension = affects()
```

## Explanation

Pass it to the schema builder. The schema it builds skips the validation of hidden fields, and the builder's [`getVisibility()`](/api/schema/SchemaBuilder#getvisibility) tells renderers what to hide and to clear. Without it, `affects` is an unknown key, so a definition never runs without its conditions by mistake.

The package also ships `definition.schema.json`, the JSON Schema of definitions for a builder with `affects()`. See [JSON Schema](/guide/json-schema). While the package is before 1.0, the hosted copy follows the latest release and can change in a breaking 0.x release. For a stable one, point at `https://unpkg.com/@whatsaaaa/form-builder-affects@<version>/definition.schema.json`, with the version you installed.

## Returns

- `extension` <code>[AffectsExtension](/api/affects/AffectsExtension)</code>

## Example

<<< @/snippets/schema/conditions.ts#builder

## Related

### Guides

- [Conditions](/guide/conditions)
- [Extensions](/guide/extensions)

### Types

- [Affect](/api/affects/Affect)
- [Condition](/api/affects/Condition)
