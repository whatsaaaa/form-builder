---
description: Type definitions written in TypeScript with defineForm, and type the form with your own input and output types.
---

# TypeScript

A definition is data, so TypeScript can't see its fields. Below you will learn the two ways to bring types back: typing a definition you write in code, and typing the form a definition builds.

## Writing definitions in code

When you write a definition in TypeScript, `defineForm()` checks it against the builder's registries, your own types and rules included. It returns the definition unchanged:

<<< @/snippets/schema/define-form.ts#define

These are compile errors:

<<< @/snippets/schema/define-form.ts#errors

- **Checked:** unknown types, rules and form rules, keys that are neither the keys every field takes nor props of its type, and props and params of the wrong type. Child fields of groups and lists are checked the same way, and so are the layout's nodes, with display elements typed by their props, and `affects` with the affects package.
- **Not checked:** whether a rule fits the field's kind, names, defaults, the paths of form rules and of the layout, and spans. [`validate()`](/guide/checking-definitions) checks those.
- The builder knows your types and rules by name when you pass them in the options, as above. Options typed as `SchemaBuilderOptions` have no known names, so `defineForm` then takes any type.

## Typing the form

The output of a built schema is an object of `unknown` values, and Formisch's functions take only top-level paths on it. When you know the shape, give `build()` your input type, and your output type when it differs:

<<< @/snippets/schema/typed-schema.ts#typed

The adapters' `useJsonForm` takes the same types, so Formisch checks paths and values as in any form:

::: code-group

<<< @/snippets/vue/typed-form.ts#typed [Vue]

<<< @/snippets/react/typed-form.ts#typed [React]

:::

- It is the same schema, typed as [`TypedBuiltSchema`](/api/schema/TypedBuiltSchema). An interface works as the type, which Formisch's own constraint wouldn't take as it is.
- **The types are a promise you make.** Nothing checks them against the definition, so keep the two in step.
- **With conditions**, a field that can hide submits nothing while it is hidden, even a required one. Make it optional in the output type.
- Paths that come from the definition, like a [`FieldNode`](/api/schema/FieldNode)'s, still need `as never` for Formisch, since TypeScript can't know them.

## Why the output isn't inferred

A field type's `schema()` returns any Valibot schema, so a definition doesn't say what type each value has, and `v.InferOutput` of a built schema is an object of `unknown` values. Inferring it would need every field type to declare its output type. Until then, give `build()` or `useJsonForm` your types.
