---
description: Whether the definition makes a field required.
---

# isRequired

Tells whether the definition makes a field required: `required: true`, or `required: { message }`.

```ts
const required = isRequired(field)
```

## Parameters

- `field` <code>[JsonField](/api/schema/JsonField)</code>

### Explanation

Use it to show an asterisk next to a label. The schema does the checking, so a renderer needs it for display only. The adapters pass it to your components as `required`.

## Returns

- `required` <code>boolean</code>

## Related

### Guides

- [Define your form](/guide/define-your-form#required-fields)
