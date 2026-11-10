---
description: What changed in the public API and the format on the way to 1.0, and how to update your code and definitions.
---

# Migrating to 1.0

On the way to 1.0, the API and the JSON format got a last review, so that 1.0 only promises what is meant to stay. Below you will learn every change it made, and how to update. What 1.0 promises from then on is in [stability](/guide/stability), and the versions it supports in [supported versions](/guide/support).

## Packages

The schema, Vue and React packages go to 1.0. The affects package stays before 1.0 for now, so a 0.x minor of it can still change `affects`. Update them together: the adapters and the affects package need the schema package of the same major.

## Renamed

- **`JsonFormSchema` is now `BuiltSchema`.** It is the Valibot schema `build()` gives, not a JSON one: `JsonForm` is the definition, and `JsonSchema` the JSON Schema. `FormSchema` is Formisch's.
- **`TypedJsonFormSchema` is now `TypedBuiltSchema`**, the same for the typed schema.
- **`fieldPathsOf` is now `fieldPathsOfStep`.** It reads a step, like `issuesOfStep`, so the two step helpers are named alike.

The old names are gone, with no alias: rename them in your imports.

## Removed

- **`getInitialInput(json)`**: use `createSchemaBuilder().getInitialInput(json)`.
- **`walkFields(json)`**: use `createSchemaBuilder().walkFields(json)`.

The functions only knew the built-in `group` and `array` types, while the builder's methods of the same name read every container type the builder has, and give each field its kind. The builder's `getInitialInput` leaves out a field with issues, so check the definition with `validate()` first.

## Reserved for later versions

These names are reserved now, so a 1.x minor can give them a meaning without breaking your code. Any other new reserved name only comes in a major version. See [reserved keys](/api/schema/reserved-keys).

- **Field keys** `id`, `disabled`, `readonly`, `hidden`, `help` and `meta`. A field type's props and an extension's keys can't use them: `createSchemaBuilder()` throws a `TypeError`. A field that has one is `unknown_key`. Rename the prop, for example `hidden` to `isHidden`, or put a setting for your renderer under `ui`.
- **Layout node types** `tabs`, `tab`, `columns`, `column`, `group` and `fieldset`, next to `section`, `row` and `slot`. A display element's type can't use them, or the three in use: `createSchemaBuilder()` throws a `TypeError`. A field type with a value, like a container named `section`, still can. A layout item with one of these types is `unknown_type`. A `group` written in a layout, which was `invalid_shape` as a type with a value, is `unknown_type` now.

## Behavior changes

These came in schema 0.16. Your code needs no change, but tests that assert messages or the issues of form rules may.

- **A required field whose key is missing** from the input reports its required message, the same as one that is `undefined`. It reported Valibot's own `Invalid key: Expected "email" but received undefined` before. Formisch always sends every key, so this changes the messages of other input, like a request to your server. See [validating on the server](/guide/server-validation#missing-keys).
- **The `message` of a single parse**, like `v.parse(schema, input, { message })`, no longer reaches the issues of the form's objects themselves, like an input that is no object, as the schema now sets their message. It still reaches the issues of the fields. To set one for objects, use `v.setSpecificMessage(v.object, ...)`, `v.setSchemaMessage()` or `v.setGlobalMessage()`.
- **Form rules report the same in any order.** Each one skips only when a field it reads has an issue of its own, never because of another form rule's issue. Before, a rule after a failing `sameAs` on `b` skipped `b`, but one before it didn't. So more than one form rule can now report at once. See [form rules](/guide/form-rules).

## Peer dependencies

These came in the Vue and React adapters 0.5:

- **The schema package is a peer dependency** of both adapters, not a dependency. Install it next to the adapter, as the [installation](/guide/installation) shows. With a second copy of it, a builder from your `createSchemaBuilder()` threw in `useJsonForm`, and `instanceof DefinitionError` was `false` for the adapter's errors.
- **The Vue adapter needs Valibot 1.4.1** or later, like every `@formisch/vue` 1.x, and **Vue 3.5.2** or later, the first Vue its published types check with when `skipLibCheck` is off.

See [supported versions](/guide/support) for every range.

## Issue codes

- A layout `span` that is no whole number from 1 to 12, a `span` outside a row, and the spans of a row that go over 12 columns or can't be shared evenly were `invalid_shape`. They are `invalid_span` now.
- Codes and paths are API, messages are not, and a minor version can add a code. Handle codes you don't know. See [codes are API](/guide/checking-definitions#codes-are-api-messages-are-not).

## Newly exported types

These types were already in the signatures of the public API. Now you can name them:

- `FieldsSchema` and `FormRuleAction`, the parts of [`BuiltSchema`](/api/schema/BuiltSchema)
- `KindOf`, the kind of a [field type](/api/schema/FieldTypeDef#kindof) that depends on its props
- `LayoutNodeBase`, what every [layout node](/api/schema/FormLayout#layoutnodebase) has
- `AffectsPropsSchema`, in the affects package, the schema of [`affects`](/api/affects/AffectsExtension#affectspropsschema)

## The JSON Schema

The shipped `definition.schema.json` files now have an `$id`, and this site hosts them at it. Point `$schema` at the URL, or keep the path into `node_modules`. See [JSON Schema](/guide/json-schema).

- `https://whatsaaaa.github.io/form-builder/schema/v1/definition.schema.json`
- `https://whatsaaaa.github.io/form-builder/schema/v1/affects/definition.schema.json`

The affects package stays before 1.0, so its hosted schema follows the latest affects release. To pin it, use `https://unpkg.com/@whatsaaaa/form-builder-affects@<version>/definition.schema.json`.

## Unchanged

`version` stays `"1"`: no definition needs a change for 1.0, unless it used a key or a layout type that is now reserved. See [the format version](/guide/format-version).
