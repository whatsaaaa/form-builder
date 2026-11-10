---
description: Formisch's initialInput for a definition, from the defaults of its fields.
---

# getInitialInput

Gives Formisch's `initialInput` for a definition: each field's `default`, nested the way the value is.

```ts
const input = getInitialInput(definition)
```

## Parameters

- `definition` <code>[JsonForm](/api/schema/JsonForm)</code>

### Explanation

A group gives an object of its fields' input, and a list without a default gives `[]`. Other fields without a default, and display elements, are left out.

It reads the built-in `group` and `array` types and needs no builder, so it doesn't check the definition: run `validate()` first. With your own container types, or with conditions that clear fields at the start, use the builder's [`getInitialInput`](/api/schema/SchemaBuilder#getinitialinput) instead.

## Returns

- `input` <code>Record&lt;string, unknown&gt;</code>

## Related

### Functions

- [walkFields](/api/schema/walkFields)
- [SchemaBuilder.getInitialInput](/api/schema/SchemaBuilder#getinitialinput)
