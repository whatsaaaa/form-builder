# @whatsaaaa/form-builder-schema

## 0.3.0

### Minor Changes

- [#4](https://github.com/whatsaaaa/form-builder/pull/4) [`2a2970e`](https://github.com/whatsaaaa/form-builder/commit/2a2970e2534ce643ae455d46d9d3a9b71210e2f4) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - ---

  '@whatsaaaa/form-builder-schema': minor
  ---

  The Valibot rule catalog: every Valibot action whose arguments fit in JSON is now a rule with the same name, 80 in all.

  **Rules come in families** you can register on their own: `lengthRules`, `textUnitRules`, `contentRules`, `formatRules`, `dateRules`, `comparisonRules`, `numberRules`, `fileRules` and `normalizeRules`. `defaultRules` spreads all of them.

  ```ts
  const { build } = createSchemaBuilder({
    includeDefaultRules: false,
    rules: { ...formatRules, ...lengthRules },
  })
  ```

  **Rules describe themselves.** Every built-in rule has `meta` with a `label` and a `category`, and `rulesForKind(kind)` lists the rules that fit a kind, for the builder app's rule picker.

  **`params` can depend on the kind.** `minValue` takes a number on a number field and an ISO string on a date field. Consumer rules can do the same with `params: (kind) => v.object(…)`.

  **Changes to existing rules:**

  - `minLength` and `maxLength` also work on array fields, and `minValue` and `maxValue` on date fields.
  - `regex` checks its `pattern` and `flags` together: a pattern `RegExp` rejects is an `invalid_params` issue instead of an error from `build()`. The `g` and `y` flags are ignored.
  - A rule used on a kind it doesn't support reports only `kind_mismatch`. Its params are no longer checked, because they can depend on the kind.

  **Valibot 1.3 or later is required**

## 0.2.0

### Minor Changes

- [#2](https://github.com/whatsaaaa/form-builder/pull/2) [`72c344e`](https://github.com/whatsaaaa/form-builder/commit/72c344ea5dc466b748c1160cc698df1bcb78a3a6) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Foundation for 1.0: registrable kinds, field type props, strict rule params and `validate()`. This is the one breaking release of 0.x.

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

## 0.1.0

### Minor Changes

- [`5d616c2`](https://github.com/whatsaaaa/form-builder/commit/5d616c21147b3136a5a7de8ac3b8fffa185f0dcf) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - initial release
