---
description: Get autocompletion and checks for definitions in your editor, with the JSON Schema the packages ship or one made for your own registries.
---

# JSON Schema

A JSON Schema lets your editor suggest field types, rules and their params while you write a definition, and mark mistakes as you type. Below you will learn how to use the JSON Schema the packages ship, and how to make one for your own types and rules.

## Using the shipped schema

The schema package ships `definition.schema.json`, the JSON Schema of definitions for the built-in types and rules. Point a definition at it with `$schema`, and VS Code and other editors pick it up:

```json
{
  "$schema": "./node_modules/@whatsaaaa/form-builder-schema/definition.schema.json",
  "version": "1",
  "fields": [{ "name": "email", "type": "email" }]
}
```

With [conditions](/guide/conditions), use the one the affects package ships instead. It has every key of the schema package's, and `affects` on fields, steps and sections:

```json
{
  "$schema": "./node_modules/@whatsaaaa/form-builder-affects/definition.schema.json",
  "version": "1",
  "fields": []
}
```

The `$schema` key is allowed in every definition, and never read.

## Making your own

For a builder with your own field types, rules or extensions, make the JSON Schema with `toJsonSchema()`. It needs the optional peer `@valibot/to-json-schema`, so it has its own entry, `@whatsaaaa/form-builder-schema/json-schema`:

<<< @/snippets/schema/json-schema.ts#make

The `meta` of your types and rules becomes their `title` and `description`, which editors show in their suggestions.

## What it checks

- **It checks** type names, the keys and props of each type, the rules that fit a type's kind and their params, form rules and their params, and the layout's nodes and their keys, with `span` only in a row.
- **It can't check** what only `validate()` does: duplicate names, defaults, the paths of form rules, of the layout and of conditions, placements, row totals, and checks with no JSON Schema keyword, like options with different values. Run [`validate()`](/guide/checking-definitions) on the definitions you store.
- A props or params schema with no JSON Schema form, like `v.custom()` or `v.instance()`, lets that type or rule take any keys, and `toJsonSchema()` logs a warning.
