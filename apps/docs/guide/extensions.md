---
description: How extensions add keys of their own to definitions, like the conditions of the affects package, and how to write one.
---

# Extensions

An extension is a feature from another package that reads keys of its own on fields, and on the layout's steps and sections. The [affects package](/guide/conditions) is one: its `affects` hide and clear fields by conditions. Below you will learn what extensions do, and how to write one.

## Using extensions

Pass extensions to the builder:

<<< @/snippets/schema/conditions.ts#builder

- **Without the extension, its keys are unknown keys**, so a definition that uses them fails `validate()`, rather than running without its conditions.
- **The schema skips what the conditions hide.** Each field that conditions can hide gets a gate around its schema, and the schema works out what is hidden from the input on each parse. A hidden field reports no issue, in every Formisch package and in a plain `v.parse`, and a form rule is skipped where a field it reads is hidden.
- **The schema keeps its shape.** The gates keep the type and keys of each field's schema, so Formisch makes the same fields. A definition without conditions builds exactly the schema it builds without the extension.
- **`getVisibility()`** tells renderers what is hidden for any input. See [conditions](/guide/conditions#rendering).
- **Several extensions** work together: a field is hidden when any of them hides it.

## Writing an extension

An extension is an object that matches the [`SchemaExtension`](/api/schema/SchemaExtension) interface. This one adds `lockedBy`, which hides a field while a checkbox is ticked:

<<< @/snippets/schema/extensions.ts#extension

- `name` names the extension in messages.
- `fieldProps` is a Valibot object schema of the keys it adds to every field and to every display element written in the layout. `layoutProps` does the same for the layout's steps and sections. `defineForm()` types them, and `toJsonSchema()` writes them.
- `definitions` names the schemas its props refer to, for `toJsonSchema()`, like a condition that holds conditions.
- `check(ctx)` runs once the fields, form rules and layout are checked. It reports issues with `ctx.issue()`, finds the fields it reads with `ctx.resolve()`, and returns the conditions of each target: the fields they read, and whether they hide and clear it for an input.

The builder does the rest: groups, lists, sections and steps hide what is in them, a hidden field reads as empty in other conditions, and loops are `cycle` issues.

## Mistakes

A key that an extension adds can't be a reserved key, a prop of a field type, or a key of another extension. Mistakes like these throw a `TypeError` from `createSchemaBuilder()`.
