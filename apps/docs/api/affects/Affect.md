---
description: One effect of a field, step or section, and the condition that applies it.
---

# Affect

One effect of a field, step or section, and when it applies.

## Definition

- `Affect`
  - `effect` <code>[Effect](/api/affects/Affect#effect)</code>
  - `when` <code>[Condition](/api/affects/Condition)</code>

## Effect

```ts
type Effect = 'show' | 'hide' | 'hideAndClear'
```

`hide` hides the field and keeps its value, `hideAndClear` hides it and clears its value, and `show` shows it only while its condition is met. Hide always wins.

## Related

### Guides

- [Conditions](/guide/conditions#effects)

### Types

- [Condition](/api/affects/Condition)
