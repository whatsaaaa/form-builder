---
description: The built-in kinds, by name, with what counts as empty for each.
---

# defaultKinds

The built-in kinds, by name: `string`, `number`, `boolean`, `date`, `array`, `file`, `object` and `none`.

```ts
const kinds = defaultKinds
```

## Explanation

Each says what counts as empty, and adds a required check where emptiness isn't enough:

| Kind      | Empty                                  | Required                  |
| --------- | -------------------------------------- | ------------------------- |
| `string`  | `undefined`, `null` or `''`            | not empty                 |
| `number`  | `undefined`, `null`, `''` or `NaN`     | not empty                 |
| `boolean` | `undefined` or `null`                  | `true`, like a ticked box |
| `date`    | `undefined`, `null` or `''`            | not empty                 |
| `array`   | `undefined`, `null` or `[]`            | at least one item         |
| `file`    | `undefined` or `null`                  | not empty                 |
| `object`  | `undefined` or `null`                  | not empty                 |
| `none`    | always: a display element has no value | never checked             |

Your own kinds merge over them by name, with the `kinds` option.

## Related

### Types

- [KindDef](/api/schema/KindDef)
- [ValueKind](/api/schema/ValueKind)
