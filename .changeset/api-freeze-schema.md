---
'@whatsaaaa/form-builder-schema': minor
---

Freeze review of the API and format before 1.0. Breaking changes, with the full list and how to update in the docs' "Migrating to 1.0" guide:

- `JsonFormSchema` is now `BuiltSchema`, and `TypedJsonFormSchema` is now `TypedBuiltSchema`: it is the Valibot schema `build()` gives, not a JSON one, and `FormSchema` is Formisch's own name. `fieldPathsOf` is now `fieldPathsOfStep`, named like `issuesOfStep`. There are no aliases for the old names.
- The `getInitialInput` and `walkFields` functions are removed. Use the builder's methods of the same name, `createSchemaBuilder().getInitialInput(json)` and `createSchemaBuilder().walkFields(json)`, which read every container type the builder has.
- The field keys `id`, `disabled`, `readonly`, `hidden`, `help` and `meta` are reserved for later versions: a field type's props and an extension's keys can't use them, and a field with one is `unknown_key`. The layout node types `tabs`, `tab`, `columns`, `column`, `group` and `fieldset` are reserved next to `section`, `row` and `slot`: a display element's type can't use any of them, and a layout node with a kept type is `unknown_type`. Any other new reserved name only comes in a major version. `RESERVED_LAYOUT_TYPES` and `RESERVED_LAYOUT_KEYS` are exported next to the other reserved keys.
- Layout span mistakes, a `span` that is no whole number from 1 to 12, a `span` outside a row, and the spans of a row that don't fit it, are the new issue code `invalid_span` instead of `invalid_shape`. Issue codes and paths are API, messages are not, and a minor version can add a code.

Also: `FieldsSchema`, `FormRuleAction`, `KindOf` and `LayoutNodeBase`, which were already in public signatures, are exported. `definition.schema.json` has an `$id`, and the docs site hosts it there, at https://whatsaaaa.github.io/form-builder/schema/v1/definition.schema.json. `version` stays `"1"` for all of 1.x. The `SchemaExtension` docs say how the extension contract can grow in a minor version.
