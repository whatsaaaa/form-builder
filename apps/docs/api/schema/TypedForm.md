---
description: A definition typed against one builder's registries and extensions, for defineForm.
---

# TypedForm

A definition written against one builder's registries, as [`defineForm()`](/api/schema/SchemaBuilder#defineform) takes it. It is also a `JsonForm`.

## Generics

- `TFieldTypes` <code>extends Record&lt;string, [FieldTypeDef](/api/schema/FieldTypeDef)&gt;</code>
- `TRules` <code>extends Record&lt;string, [RuleDef](/api/schema/RuleDef)&gt;</code>
- `TFormRules` <code>extends Record&lt;string, [FormRuleDef](/api/schema/FormRuleDef)&gt;</code>
- `TExtensionProps` <code>extends [ExtensionProps](/api/schema/TypedForm)</code>

## Definition

- `TypedForm`
  - `version` <code>'1'</code>
  - `fields` <code>readonly [TypedField](/api/schema/TypedForm)[]</code>
  - `formRules` <code>readonly [TypedFormRule](/api/schema/TypedForm)[]</code>: optional
  - `layout` <code>[TypedLayout](/api/schema/TypedForm)</code>: optional
  - `$schema` <code>string</code>: optional

### Explanation

The package also exports the types it is made of:

- `TypedField`: a field of a registered type, with that type's props, the keys every field takes, and the keys extensions add.
- `TypedRule` and `TypedFormRule`: a registered rule or form rule, with its params.
- `TypedLayout` and `TypedLayoutItem`: the layout, with display elements typed by their props.
- `ExtensionProps` and `NoExtensionProps`: the keys a builder's extensions add to fields, and to steps and sections.

## Related

### Guides

- [TypeScript](/guide/typescript#writing-definitions-in-code)
