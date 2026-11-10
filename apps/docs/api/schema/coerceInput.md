---
description: Turns what an input element gives into the value a field's schema expects.
---

# coerceInput

Turns what an input element gives into the value a field's schema expects, by the field's kind.

```ts
const value = coerceInput(input, field)
```

## Parameters

- `input` <code>unknown</code>
- `field` <code>{ kind: ValueKind; itemKind?: [ValueKind](/api/schema/ValueKind) }</code>: a `FieldNode`, or anything with its kinds

### Explanation

| Kind                | Input                   | Value                          |
| ------------------- | ----------------------- | ------------------------------ |
| `number`            | `''` or only spaces     | `undefined`                    |
| `number`            | a numeric string, `'5'` | `5`                            |
| `file`              | a `FileList`            | its first file, or `undefined` |
| `array` of `file`   | a `FileList`            | a list of its files            |
| `array` of `number` | numeric strings         | numbers                        |

Anything else is passed through, and the schema reports it. The adapters' `setInput` calls it for you.

## Returns

- `value` <code>unknown</code>

## Related

### Guides

- [Rendering with Formisch](/frameworks/formisch#value-fields)
- [Field components](/frameworks/field-components#setting-the-value)
