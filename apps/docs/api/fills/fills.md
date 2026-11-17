---
description: 'The extension that adds fills to definitions: other fields set from the value of a field, by a map or a source of yours.'
---

# fills

Creates the extension that adds `fills` to definitions: each new value of a field, its trigger, sets other fields, with values from a map in the definition or from a source of yours.

```ts
const extension = fills(options)
```

## Parameters

- `options` <code>FillsOptions</code>: optional
  - `sources` <code>Readonly&lt;Record&lt;string, [FillSource](/api/fills/FillSource)&gt;&gt;</code>: optional, the sources a fill can name with `source`, by name

### Explanation

Pass it to the schema builder. The builder's [`getFills()`](/api/schema/SchemaBuilder#getfills) runs the fills in a form, and its `getInitialInput()` starts a new form with the values of the maps for each default. Without the extension, `fills` is an unknown key, so a definition never runs without its fills by mistake. Fills change nothing in the schema `build()` gives, so a server validates filled values like typed ones.

With `sources`, `validate()` reports a `source` that isn't one of them as `unknown_source`, and `defineForm()` types `source` as one of their names. Without them, names aren't checked, which suits a server that only validates: no source runs there. A form that runs a fill whose source the extension doesn't have reports a `TypeError` through its error handler. `fills()` throws a `TypeError` for a source that is no function.

The package also ships `definition.schema.json`, the JSON Schema of definitions for a builder with `fills()`. See [JSON Schema](/guide/json-schema). While the package is before 1.0, the hosted copy follows the latest release and can change in a breaking 0.x release. For a stable one, point at `https://unpkg.com/@whatsaaaa/form-builder-fills@<version>/definition.schema.json`, with the version you installed.

## Returns

- `extension` <code>[FillsExtension](/api/fills/FillsExtension)</code>

## Example

<<< @/snippets/schema/fills.ts#builder

## Related

### Guides

- [Fills](/guide/fills)
- [Extensions](/guide/extensions#fills)
- [Checking definitions](/guide/checking-definitions#fills)

### Types

- [Fill](/api/fills/Fill)
- [FillSource](/api/fills/FillSource)
