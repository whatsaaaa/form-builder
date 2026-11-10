---
description: The JSON Schema of definitions for a builder's registries, for editors.
---

# toJsonSchema

Makes the JSON Schema (draft-07) of definitions for a builder's registries and extensions, for editors and other tools. It is in its own entry, `@whatsaaaa/form-builder-schema/json-schema`, as it needs the optional peer `@valibot/to-json-schema`.

```ts
const schema = toJsonSchema(registries)
```

## Parameters

- `registries` <code>[JsonSchemaRegistries](/api/schema/toJsonSchema#jsonschemaregistries)</code>: a builder from `createSchemaBuilder()` has them

### Explanation

It knows every type, rule and form rule by name, with their props and params, the layout's nodes, and the keys of the extensions. It can't know what only `validate()` checks, like duplicate names, defaults and paths.

## Returns

- `schema` <code>JsonSchema</code>

## JsonSchemaRegistries

- `JsonSchemaRegistries`
  - `fieldTypes` `Readonly<Record<string, FieldTypeDef>>`
  - `rules` `Readonly<Record<string, RuleDef>>`
  - `formRules` `Readonly<Record<string, FormRuleDef>>`
  - `extensions` `readonly SchemaExtension[]`: optional

## Example

<<< @/snippets/schema/json-schema.ts#make

## Related

### Guides

- [JSON Schema](/guide/json-schema)
