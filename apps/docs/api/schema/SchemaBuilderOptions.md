---
description: 'The options of createSchemaBuilder: your own registries, messages and extensions.'
---

# SchemaBuilderOptions

The options of [`createSchemaBuilder`](/api/schema/createSchemaBuilder).

## Definition

- `SchemaBuilderOptions`
  - `kinds` <code>Record&lt;string, [KindDef](/api/schema/KindDef)&gt;</code>: your own kinds, merged over the built-in ones
  - `fieldTypes` <code>Record&lt;string, [FieldTypeDef](/api/schema/FieldTypeDef)&gt;</code>: your own field types, merged over the built-in ones
  - `rules` <code>Record&lt;string, [RuleDef](/api/schema/RuleDef)&gt;</code>: your own rules, merged over the built-in ones
  - `formRules` <code>Record&lt;string, [FormRuleDef](/api/schema/FormRuleDef)&gt;</code>: your own form rules, merged over the built-in ones
  - `includeDefaultRules` <code>boolean</code>: with `false`, only your own rules and form rules. Defaults to `true`
  - `messages` <code>{ required?: string }</code>: the required message of fields without their own. Defaults to `'Required'`
  - `resolveMessage` <code>(key: string, ctx: [MessageContext](/api/schema/MessageContext)) =&gt; string | undefined</code>: translates every message, label and description. `undefined` keeps the text
  - `extensions` <code>readonly [SchemaExtension](/api/schema/SchemaExtension)[]</code>: features that read keys of their own, like `affects()`

### Explanation

Every option is optional. See [messages and i18n](/guide/messages) for `messages` and `resolveMessage`, and [extensions](/guide/extensions) for `extensions`.

## Related

### Functions

- [createSchemaBuilder](/api/schema/createSchemaBuilder)

### Types

- [MessageContext](/api/schema/MessageContext)
- [SchemaExtension](/api/schema/SchemaExtension)
