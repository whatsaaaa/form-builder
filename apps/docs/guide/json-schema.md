---
description: Get autocompletion and checks for definitions in your editor, with the JSON Schema the packages ship or one made for your own registries.
---

# JSON Schema

A JSON Schema lets your editor suggest field types, rules and their params while you write a definition, and mark mistakes as you type. Below you will learn how to use the JSON Schema the packages ship, and how to make one for your own types and rules.

## Using the shipped schema

The schema package ships `definition.schema.json`, the JSON Schema of definitions for the built-in types and rules, and this site hosts it for each [format version](/guide/format-version). Point a definition at it with `$schema`, and VS Code and other editors pick it up:

```json
{
  "$schema": "https://whatsaaaa.github.io/form-builder/schema/v1/definition.schema.json",
  "version": "1",
  "fields": [{ "name": "email", "type": "email" }]
}
```

With [conditions](/guide/conditions), use the one with `affects` instead. It has every key of the schema package's, and `affects` on fields, steps and sections:

```json
{
  "$schema": "https://whatsaaaa.github.io/form-builder/schema/v1/affects/definition.schema.json",
  "version": "1",
  "fields": []
}
```

With [fills](/api/fills/), use the one with `fills` on fields:

```json
{
  "$schema": "https://whatsaaaa.github.io/form-builder/schema/v1/fills/definition.schema.json",
  "version": "1",
  "fields": []
}
```

While the affects and fills packages are before 1.0, their hosted schemas follow their latest release, so a breaking 0.x release can change them. To keep one stable, point at the copy of the version you installed, like `https://unpkg.com/@whatsaaaa/form-builder-affects@<version>/definition.schema.json`.

- Each URL is the schema's `$id`. The `v1` in it is the format version, so it stays the same for every 1.x release, and always has the latest additions. The affects and fills schemas also follow their packages, see above.
- To work offline, or to pin the schema to the package version you installed, point at the copy in the package: `./node_modules/@whatsaaaa/form-builder-schema/definition.schema.json`, `@whatsaaaa/form-builder-affects/definition.schema.json` for conditions, or `@whatsaaaa/form-builder-fills/definition.schema.json` for fills.
- The `$schema` key is allowed in every definition, and never read.

## Making your own

For a builder with your own field types, rules or extensions, make the JSON Schema with `toJsonSchema()`. It needs the optional peer `@valibot/to-json-schema`, so it has its own entry, `@whatsaaaa/form-builder-schema/json-schema`:

<<< @/snippets/schema/json-schema.ts#make

The `meta` of your types and rules becomes their `title` and `description`, which editors show in their suggestions.

The shipped schemas know the built-in registries and at most one extension. For a definition with several extensions, like `affects` and `fills`, make its schema the same way, from a builder with every extension: `toJsonSchema(createSchemaBuilder({ extensions: [affects(), fills({ sources })] }))`. Write it to a file, and point `$schema` at that file. With the sources you give `fills()`, it lists their names for `source`, so your editor suggests them.

## What it checks

- **It checks** type names, the keys and props of each type, the rules that fit a type's kind and their params, form rules and their params, and the layout's nodes and their keys, with `span` only in a row.
- **It can't check** what only `validate()` does: duplicate names, defaults, the paths of form rules, of the layout, of conditions and of fills, the keys and values of a fill's map, the names of sources, placements, row totals, and checks with no JSON Schema keyword, like options with different values. Run [`validate()`](/guide/checking-definitions) on the definitions you store.
- A props or params schema with no JSON Schema form, like `v.custom()` or `v.instance()`, lets that type or rule take any keys, and `toJsonSchema()` logs a warning.
