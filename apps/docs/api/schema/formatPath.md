---
description: Turns a definition path into text, like fields[1].rules[0].
---

# formatPath

Turns a path into a definition into text: `['fields', 1, 'rules', 0]` into `fields[1].rules[0]`.

```ts
const text = formatPath(path)
```

## Parameters

- `path` <code>[DefinitionPath](/api/schema/DefinitionIssue#definitionpath)</code>

## Returns

- `text` <code>string</code>

## Example

<<< @/snippets/schema/checking-definitions.ts#validate

## Related

### Types

- [DefinitionIssue](/api/schema/DefinitionIssue)
