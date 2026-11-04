---
'@whatsaaaa/form-builder-schema': minor
---

Tooling: a JSON Schema of the definition format, typed definitions in TypeScript, labels as schema metadata, and generated reference docs.

```json
{
  "$schema": "./node_modules/@whatsaaaa/form-builder-schema/definition.schema.json",
  "version": "1",
  "fields": [{ "name": "email", "type": "email" }]
}
```

**JSON Schema:** the package ships `definition.schema.json` for the default registries, so editors suggest types, rules and params, and mark mistakes. `$schema` is now allowed at the top of a definition, and never read. For your own registries, `toJsonSchema(builder)` comes from the new entry `@whatsaaaa/form-builder-schema/json-schema`, and needs the optional peer `@valibot/to-json-schema` 1.6 or later.

**Typed definitions:** `defineForm(definition)` on the builder makes an unknown type, rule or key, and a param of the wrong type, a compile error. It returns the definition unchanged. `createSchemaBuilder` keeps the keys of the registries you pass, and its return type is the new `SchemaBuilder`. Also new: `TypedForm`, `TypedField`, `TypedRule` and `TypedFormRule`.

**Metadata:** each field's schema carries its `label` as `v.title()` and its `description` as `v.description()`. `resolveMessage` is now called with labels and descriptions too, so return `undefined` for text you don't translate.

**Field type meta:** `FieldTypeDef` takes an optional `meta` with a `label` and a `description`, like rules, and every built-in type has one. Also new: `FieldTypeMeta`.

**Reference docs:** `docs/rules.md` and `docs/field-types.md` list every built-in rule and type, generated from the registry.
