---
description: 'The name of a kind: a built-in one, or any string for your own.'
---

# ValueKind

The name of a kind.

```ts
type ValueKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'file'
  | 'object'
  | 'none'
  | (string & {})
```

## Explanation

The built-in kinds, plus any string, for kinds of your own.

## Related

### Constants

- [defaultKinds](/api/schema/defaultKinds)

### Types

- [KindDef](/api/schema/KindDef)
