---
description: Register field types of your own, with their props, schema and kind, including types that hold other fields.
---

# Custom field types

The built-in types cover the native form controls. When your forms need a value of another shape, like a list of tags or an amount of money, register a field type of your own. Below you will learn how.

::: tip
Many specific fields don't need a type of their own. A star rating is a `number` with `"ui": { "widget": "rating" }`, and your renderer picks the component by the widget. Register a type when the value or its checks differ.
:::

## Defining a type

`defineFieldType()` defines a type, and `createSchemaBuilder()` registers it under a name. Your types merge over the built-in ones by name, so a type named `text` replaces the built-in one:

<<< @/snippets/schema/custom-field-types.ts#tags

A definition can now use it, with its props next to the field's other keys:

<!-- docs: fragment -->

```json
{ "name": "labels", "type": "tags", "label": "Labels", "max": 5 }
```

A type takes:

- `kind`: the kind of its value, which decides the rules that fit it and what counts as empty. The built-in kinds are `string`, `number`, `boolean`, `date`, `array`, `file`, `object` and `none`, for a type without a value, like a heading.
- `props`: a Valibot object schema of the extra keys the type takes. Unknown keys are issues. `schema()` and `kind` get the field with its props parsed and typed.
- `schema(field, ctx)`: the Valibot schema of the value, before the field's rules. Every type with a value needs one.
- `itemKind`: for a type of kind `array`, the kind of each item. A rule for that kind, but not for arrays, then runs on each item and reports on the field.
- `defaultRules`: rules every field of the type gets, like the `email` rule of the `email` type. A rule of the field with the same name replaces one.
- `required(message)`: replaces the kind's required check. Return `null` for none, like a yes or no radio that accepts `false`.
- `finalize(field)`: an action that runs after every rule, like `v.toDate()` for a date that outputs a `Date`.
- `meta`: a `label` and a `description` for people, which the JSON Schema and a type picker use.

The [`FieldTypeDef`](/api/schema/FieldTypeDef) reference has the details.

## A kind from the props

`kind` can be a function of the field, for a type whose value depends on its props, like a select whose options are numbers:

<<< @/snippets/schema/custom-field-types.ts#kind

## Types that hold fields

A type whose value holds other fields sets `container: true`, and builds them with `ctx.buildFields(fields, path)`, or `ctx.buildField(field, path)` for the items of a list. Its kind is `object` or `array`:

<<< @/snippets/schema/custom-field-types.ts#container

- The builder checks the child fields like any others, so their issues have their full path, and form rules, layouts and conditions reach them by their dot paths.
- A container's value is never empty: a missing one becomes `{}` or `[]`, and its rules always run.
- Renderers get it with the role `group` for kind `object`, or `array` for kind `array`, so it renders like a group or a list.
- To read definitions with your own containers, use the builder's `getInitialInput()` and `walkFields()`. The functions of the same name only know the built-in `group` and `array`.

## Your own kinds

A kind says what counts as empty with `isEmpty`, and can add a `required` check, like the `string` kind's `v.nonEmpty()`. Register kinds of your own with the `kinds` option, by name, next to the built-in ones. See [`KindDef`](/api/schema/KindDef).

## Testing a type

To test a type on its own, give its `schema()` a context from `createBuildContext()`. Its `buildFields` and `buildField` use the default registries, and throw a `DefinitionError` when the child fields have issues:

<<< @/snippets/schema/custom-field-types.ts#test

## Mistakes

Mistakes in the registry throw a `TypeError` from `createSchemaBuilder()`, like an unknown kind, a container of kind `string`, a type with a value but no `schema()`, or props that use a key every field already has, like `label`. The [reserved keys](/api/schema/reserved-keys) lists them.
