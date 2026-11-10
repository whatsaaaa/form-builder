---
description: 'What resolveMessage gets with each text: the field, the rule and the path.'
---

# MessageContext

The second argument of `resolveMessage`.

## Definition

- `MessageContext`
  - `field` <code>[JsonField](/api/schema/JsonField)</code>: the field the text belongs to
  - `rule` <code>string</code>: optional, the rule, for a rule's or a form rule's message
  - `path` <code>[DefinitionPath](/api/schema/DefinitionIssue#definitionpath)</code>: where the field is in the definition

## Related

### Guides

- [Messages and i18n](/guide/messages)

### Types

- [SchemaBuilderOptions](/api/schema/SchemaBuilderOptions)
