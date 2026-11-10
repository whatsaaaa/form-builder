---
description: 'One form rule of a definition: its name, the field it is on, its params and message.'
---

# JsonFormRule

One form rule of a definition.

## Definition

- `JsonFormRule`
  - `rule` <code>string</code>: a registered form rule
  - `field` <code>string</code>: the dot path of the field its error shows on, like `'lines.*.qty'`
  - `message` <code>string</code>: required
  - `[param: string]` <code>unknown</code>: the form rule's params, like `other`

## Related

### Guides

- [Form rules](/guide/form-rules)
