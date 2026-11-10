---
description: The error build() throws for a definition with issues, with every issue.
---

# DefinitionError

The error that `build()`, `getFieldTree()`, `getLayout()` and `getVisibility()` throw for a definition with issues. It lists all of them.

```ts
class DefinitionError extends Error {
  readonly issues: readonly DefinitionIssue[]
}
```

## Explanation

Its `message` lists every issue with its path, one per line. Its `issues` are the issues `validate()` gives. Check for it with `instanceof`.

## Example

<<< @/snippets/schema/checking-definitions.ts#build

## Related

### Guides

- [Checking definitions](/guide/checking-definitions)

### Types

- [DefinitionIssue](/api/schema/DefinitionIssue)
