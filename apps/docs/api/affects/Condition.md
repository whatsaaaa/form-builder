---
description: 'When an affect applies: a test of one field, or all or any of a list of conditions.'
---

# Condition

When an affect applies: a test of one field, by its dot path, with one operator, or every (`all`) or any (`any`) of a list of conditions.

```ts
type Condition =
  | { field: string; equals: Scalar }
  | { field: string; notEquals: Scalar }
  | { field: string; in: readonly Scalar[] }
  | { field: string; includes: Scalar }
  | { field: string; empty: true }
  | { field: string; notEmpty: true }
  | { all: readonly Condition[] }
  | { any: readonly Condition[] }
```

## Explanation

See [conditions](/guide/conditions#conditions) for the operators, the kinds each one fits, and the values it takes.

## Scalar

```ts
type Scalar = string | number | boolean
```

The value an operator compares with.

## Related

### Types

- [Affect](/api/affects/Affect)
