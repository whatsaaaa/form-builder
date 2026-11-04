# @whatsaaaa/form-builder-schema

## 0.7.0

### Minor Changes

- [#15](https://github.com/whatsaaaa/form-builder/pull/15) [`ac9aaac`](https://github.com/whatsaaaa/form-builder/commit/ac9aaac213f5787126a4a2ae590599f317718a25) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Tooling: a JSON Schema of the definition format, typed definitions in TypeScript, labels as schema metadata, and generated reference docs.

  ```json
  {
    "$schema": "./node_modules/@whatsaaaa/form-builder-schema/definition.schema.json",
    "version": "1",
    "fields": [{ "name": "email", "type": "email" }]
  }
  ```

  **JSON Schema:** the package ships `definition.schema.json` for the default registries, so editors suggest types, rules and params, and mark mistakes. `$schema` is now allowed at the top of a definition, and never read. For your own registries, `toJsonSchema(builder)` comes from the new entry `@whatsaaaa/form-builder-schema/json-schema`, and needs the optional peer `@valibot/to-json-schema` 1.6 or later.

  **Typed definitions:** `defineForm(definition)` on the builder makes an unknown type, rule or key, and a param of the wrong type, a compile error. It returns the definition unchanged. `createSchemaBuilder` keeps the keys of the registries you pass, and its return type is the new `SchemaBuilder`. Also new: `TypedForm`, `TypedField`, `TypedRule` and `TypedFormRule`.

  **Metadata:** each field's schema carries its `label` as `v.title()` and its `description` as `v.description()`. `resolveMessage` is now called with labels and descriptions too, so return `undefined` for text you don't translate.

  **Field type meta:** `FieldTypeDef` takes an optional `meta` with a `label` and a `description`, like rules, and every built-in type has one. Also new: `FieldTypeMeta`.

  **Reference docs:** `docs/rules.md` and `docs/field-types.md` list every built-in rule and type, generated from the registry.

## 0.6.0

### Minor Changes

- [#13](https://github.com/whatsaaaa/form-builder/pull/13) [`c5517c6`](https://github.com/whatsaaaa/form-builder/commit/c5517c68004f997129ad7a6e698779532edfd186) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Form rules: check a field against other fields, such as a repeated password or a date range. Definitions without `formRules` build exactly as in 0.5.

  ```json
  {
    "formRules": [
      { "rule": "sameAs", "field": "password2", "other": "password", "message": "Passwords differ" }
    ]
  }
  ```

  **New in the definition:** `formRules`, next to `fields`. Each one names the `field` its error shows on, as a dot path: `'password2'`, `'address.zip'`, or `'lines.*.qty'` to run once per item of an array. `message` is required.

  - **Built-in form rules:** `sameAs`, `differentFrom` and `compare` (`op`: `lt`, `lte`, `gt` or `gte`).
  - A form rule runs after every field's own rules, and only when the fields it reads have no issues and aren't empty. So a password that is too short never also shows "Passwords differ".
  - New issue code `unknown_field`, for a path that names no field with a value. `unknown_rule`, `unknown_param`, `invalid_params` and `kind_mismatch` are reused, on paths like `formRules[0]`.

  **For your own form rules:** `defineFormRule({ params, reads, kinds, sameKind, check, meta })`, registered with `createSchemaBuilder({ formRules })`. `check` gets the values as a plain array, and `reads` lists the paths it needs besides `field`. `defaultFormRules` and `RESERVED_FORM_RULE_KEYS` are exported, and the builder returns its `formRules`.

  **`includeDefaultRules: false`** now leaves out the built-in form rules too. Add them back with `formRules: defaultFormRules`.

## 0.5.0

### Minor Changes

- [#11](https://github.com/whatsaaaa/form-builder/pull/11) [`d86e695`](https://github.com/whatsaaaa/form-builder/commit/d86e6958fe4ab57d851eb4f6bf86b5b3e91052f0) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Groups, arrays and initial input. Groups and arrays are ordinary field types, so the 0.4 API is unchanged.

  **New field types:** `group` nests its `fields` under its name, and `array` is a list: of single values with `of`, or of objects with `fields`.

  ```json
  {
    "name": "lines",
    "type": "array",
    "required": true,
    "fields": [{ "name": "product", "type": "text" }]
  }
  ```

  - A group is always there, so it can't have `required` or `default`. A required array needs at least one item, and rules like `minLength` count its items.
  - Issues in nested fields have their full path, such as `fields[2].fields[0].rules[1]`. Duplicate names are checked among the fields next to each other only.

  **New functions:** `getInitialInput(definition)` gives Formisch's `initialInput`, built from the defaults. `walkFields(definition)` yields every field at every depth, with its data path and definition path. Neither needs a builder.

  **For your own field types:**

  - `ctx.buildFields(fields, path)` and `ctx.buildField(field, path)` build child fields with the same registries, and their issues land in the same result. A type whose value holds them sets `container: true`.
  - `createBuildContext(overrides?)` makes a context for testing a field type on its own.

  **Definitions that may need a fix:** two new checks report what 0.4 let through. A name with `.`, `[` or `]` is now `invalid_name`, and a `default` that fails its field's schema is now `invalid_default`.

## 0.4.1

### Patch Changes

- [#9](https://github.com/whatsaaaa/form-builder/pull/9) [`c4439b9`](https://github.com/whatsaaaa/form-builder/commit/c4439b986e870c0d2e3f794ca3569234d22a1dbf) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - `peerDependencies.valibot` is now `^1.3.0`. Since 0.3.0 the package has needed Valibot 1.3 for the `domain` and `isrc` rules, but the range still allowed 1.0.

## 0.4.0

### Minor Changes

- [#7](https://github.com/whatsaaaa/form-builder/pull/7) [`320f212`](https://github.com/whatsaaaa/form-builder/commit/320f2128077299d4a5ef059a3c9cfb893c09d96a) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - The field types catalog: a built-in type for every native control, plus three display elements.

  **New value types:** `textarea`, `url`, `tel`, `checkbox`, `date`, `time`, `datetime`, `select`, `radio`, `multiselect` and `file`, next to `text`, `email`, `password` and `number`.

  ```json
  {
    "name": "size",
    "type": "select",
    "options": [
      { "value": 1, "label": "Small" },
      { "value": 2, "label": "Large" }
    ]
  }
  ```

  - `select`, `radio` and `multiselect` take `options` as `{ value, label }[]`. The options' value type sets the kind, so a select with number options rejects `'1'`. A `select` without options takes any value of its `valueType`.
  - `date` and `datetime` output ISO strings. With `output: 'date'` they output a `Date`, converted after every rule.
  - `file` takes `multiple` and `accept` (MIME types). With `multiple`, `maxSize` checks each file and `maxLength` the count.
  - A checkbox group is a `multiselect` with `ui: { widget: 'checkboxes' }`.

  **New display elements:** `heading` (`text`, `level`), `paragraph` (`text`) and `divider`. They need no name and add no output key.

  **For your own field types,** all optional:

  - `kind` can be a function of the field, for a kind that depends on its props.
  - `itemKind` names the kind of each item of an array value. Rules for that kind run on each item and report on the field.
  - `required(message)` replaces the kind's required check, and `finalize(field)` adds an action that runs after every rule.

  If you registered your own `select`, `checkbox`, `date` or other type with a name that is now built in, yours still wins.

## 0.3.0

### Minor Changes

- [#4](https://github.com/whatsaaaa/form-builder/pull/4) [`2a2970e`](https://github.com/whatsaaaa/form-builder/commit/2a2970e2534ce643ae455d46d9d3a9b71210e2f4) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - The Valibot rule catalog: every Valibot action whose arguments fit in JSON is now a rule with the same name, 80 in all.

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

  **Valibot 1.3 or later is required**, because `domain` and `isrc` first shipped in 1.3. Every other action exists in 1.3, so none was left out. The rule for Valibot's `nanoid` action is named `nanoid`, as in Valibot.

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
