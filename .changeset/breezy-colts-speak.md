---
'@whatsaaaa/form-builder-schema': minor
---

Foundation for 1.0: registrable kinds, field type props, strict rule params and `validate()`. This is the one breaking release of 0.x.

**`createSchemaBuilder` returns an object.**

```ts
// before
const build = createSchemaBuilder()
// after
const { build, validate } = createSchemaBuilder()
```

**`JsonFormSchema` is now `JsonForm`, and `type` is any string.** `FieldType` is gone, so `type: 'date'` type-checks without a cast.

**Field types use `schema()` instead of `base()`.**

```ts
// before
{ kind: 'string', base: (message) => v.string(message) }
// after
{ kind: 'string', schema: (field, ctx) => v.string() }
```

**Unknown keys are rejected.** `{ rule: 'email', foo: 1 }` and `{ name: 'a', type: 'text', requird: true }` used to pass. They are now `unknown_param` and `unknown_key` issues. Put renderer settings under `ui`.

**Empty optional values output `undefined`.** An optional text field with `''` used to output `''`.

```ts
// before
v.parse(schema, { a: '' }) // { a: '' }
// after
v.parse(schema, { a: '' }) // { a: undefined }
```

**`'Invalid email'` is gone.** The `email` type's default rule uses Valibot's message unless the field sets one.

**`build()` throws a `DefinitionError` listing every issue**, instead of an `Error` for the first one.

Also new: `validate()`, `defineFieldType`, the `trim` rule, rule `stage`, `messages.required`, `resolveMessage`, `kinds`, and the exported `RESERVED_FIELD_KEYS` and `RESERVED_RULE_KEYS`.
