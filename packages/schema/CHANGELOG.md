# @whatsaaaa/form-builder-schema

## 0.15.1

### Patch Changes

- [#41](https://github.com/whatsaaaa/form-builder/pull/41) [`e4a21b4`](https://github.com/whatsaaaa/form-builder/commit/e4a21b42ba6a12e8c5263b23b19cfcc91dac7ae5) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - A shorter README, with badges for the version, downloads, CI and coverage. The full guide moved to `docs/guide.md` in the repository, linked from the README.

## 0.15.0

### Minor Changes

- [#38](https://github.com/whatsaaaa/form-builder/pull/38) [`76eba28`](https://github.com/whatsaaaa/form-builder/commit/76eba28572eb58ea2d1b6eacef2a960f0771a355) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Extensions: `createSchemaBuilder({ extensions: [...] })` takes features from other packages that read keys of their own on fields, steps and sections, like the `affects` of `@whatsaaaa/form-builder-affects`. Without the extension, its keys are unknown keys, as before. With conditions, the schema skips the validation of hidden fields and the form rules that read them, in every Formisch package and in `v.parse`, and `getInitialInput` leaves out the defaults of fields that start cleared. An extension is an object that matches the `SchemaExtension` interface, `builder.getVisibility(json)` tells renderers what is hidden for an input, and `toJsonSchema` takes the extensions' keys. Two new issue codes: `invalid_value` and `cycle`. `FieldNode`, and the layout's steps, sections and rows, get their `definitionPath`. A definition without conditions builds the schema it always did.

  The hint for a form rule path with an index, like `lines.0.qty`, now reads `lines.*.qty`, not `lines.*.0.qty`.

## 0.14.0

### Minor Changes

- [#36](https://github.com/whatsaaaa/form-builder/pull/36) [`f65a34d`](https://github.com/whatsaaaa/form-builder/commit/f65a34d93c5b36fabfbf804eb14104558377922b) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - A definition can say where its fields go, in a new optional `layout`: on one page with `items`, or over `steps`. Items are dot paths, `"*"` for the rest, sections with a title, rows of a 12-column grid whose items take a `span`, slots for content of the app, and display elements written straight into the layout. The layout never changes the value, and every field is placed exactly once. `validate()` checks it, with three new issue codes: `duplicate_placement`, `unplaced_field` and `duplicate_id`. `builder.getLayout(json)` resolves it into the tree renderers walk, and `issuesOfStep`, `fieldPathsOf`, `shownNodes` and `checkLayoutComponents` help them step through it. `toJsonSchema` and `definition.schema.json` know the layout, and `docs/frameworks.md` renders it in every framework. Definitions without a `layout` validate and build as before.

## 0.13.2

### Patch Changes

- [#33](https://github.com/whatsaaaa/form-builder/pull/33) [`f39434d`](https://github.com/whatsaaaa/form-builder/commit/f39434d3298781e0b0d5fca61a15a0a7bf9c86d0) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - A display element with a `name` no longer takes the dot path of the field of that name. Its name is no key of the value, so it has its parent's `dataPath`, and `dotPathOf` gives undefined for it. Before, a heading named `email` next to an `email` field was what `findField(fields, 'email')` and `<JsonField path="email">` gave, `except: ['email']` left out both, and the adapters gave both the same key.

## 0.13.1

### Patch Changes

- [#31](https://github.com/whatsaaaa/form-builder/pull/31) [`1453b5f`](https://github.com/whatsaaaa/form-builder/commit/1453b5f470d6414150580e9c8c6b8fc0e51e16b5) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Docs: a whole renderer for Preact, Solid, Svelte, Qwik and Angular with Formisch's own packages, in the new `docs/frameworks.md`. The integration tests run every shared fixture through each one, and `pnpm docs:gen` copies the tested files into the page.

## 0.13.0

### Minor Changes

- [#29](https://github.com/whatsaaaa/form-builder/pull/29) [`84e9a90`](https://github.com/whatsaaaa/form-builder/commit/84e9a90831602a875cb7f6f511f365e0f7558edc) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Two more render helpers, which the Vue and React adapters share:

  - `selectFields(fields, { only, except })` gives the field tree without the fields `except` names, at any depth, with `'*'` for an array's items: `except: ['lines.*.note']`. With `only`, it gives just the fields `only` names, in the order of the definition. A path that names no field throws a `TypeError`.
  - `checkComponents(nodes, components)` throws a `TypeError` that names every field type in the tree without a component, for a renderer that takes a component per type.

  ```ts
  const nodes = selectFields(builder.getFieldTree(json), { except: ['coupon'] })
  checkComponents(nodes, components) // No component for the field type "money". Add it to the components.
  ```

## 0.12.0

### Minor Changes

- [#26](https://github.com/whatsaaaa/form-builder/pull/26) [`ee8019d`](https://github.com/whatsaaaa/form-builder/commit/ee8019dd1a07fc0236629289a76fd4db8f0b9e95) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Formisch for Qwik accepts built schemas, Formisch's `field.props` reads multiselects, checkbox groups and multiple files, and a `date` with `output: 'date'` is the day the person picked in every time zone.

  **Changed output.** A `date` field with `output: 'date'` now gives local midnight of the picked day, the same way a `datetime` gives local time. It used to give UTC midnight, which is the day before west of UTC: `2000-01-15` came out as January 14 in New York. `sameAs`, `differentFrom` and `compare` read a date that holds the ISO string the same way, so they still compare it by its day with one that holds a `Date`. Code that reads the `Date` with UTC getters, like `getUTCDate()` or `toISOString()`, sees the change.

  **Fixes.**

  - `@formisch/qwik` accepts built schemas. It rejected every definition with a value field: `"lazy" schema is not supported`. A field's schema no longer wraps `v.lazy`, and checks for an empty value inside it instead.
  - Formisch makes an array field for a multiselect, a checkbox group and a file field with `multiple`, so `field.props` reads every choice and file from the elements. It used to read one value, so in every binding but Vue, whose `field.props` only validate, these forms reported `Invalid type: Expected Array but received true` and could never be submitted.
  - `build()` is typed as the new `JsonFormSchema`: the object schema of the fields, in a pipe with one check per form rule when the definition has form rules. It was typed as an object schema alone, which hid the form rules. The form rules are now all in one pipe after the object schema. TypeScript still accepts a piped object schema as an object schema, so a new object from `schema.entries` compiles but leaves the form rules out: re-pipe it with `schema.pipe`, as the README shows.

  A field's schema still starts without a value in Formisch, reports the same messages, and gives `undefined` for an empty optional field.

## 0.11.0

### Minor Changes

- [#25](https://github.com/whatsaaaa/form-builder/pull/25) [`2975556`](https://github.com/whatsaaaa/form-builder/commit/29755564f3acf08594f69e2057b746d3fd60cdcb) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Helpers to render a definition with Formisch's own package for any framework, without an adapter. They used to live in the Vue adapter only.

  ```ts
  const builder = createSchemaBuilder()
  const form = useForm({ schema: builder.build(json), initialInput: builder.getInitialInput(json) })

  for (const node of builder.getFieldTree(json)) {
    // node.role is 'value', 'group', 'array' or 'display'
  }
  ```

  - `builder.getFieldTree(json)` gives the fields as a tree of `FieldNode`s, each with its `role`, `kind`, `itemKind`, `dataPath` and `children`. Your own container types are groups or arrays by their kind. It throws a `DefinitionError` like `build()`.
  - `builder.getItemInput(field)` is the input of a new item of an array, with the defaults of its fields, for Formisch's `insert()`.
  - `coerceInput(input, node)` turns what an input element gives into the field's value: `'5'` into `5`, `''` into `undefined` for a number, and a `FileList` into a file or an array of files.
  - `toFieldPath(node.dataPath, indexes)` puts the index of each array item in place of its `'*'`: `['lines', 0, 'qty']`.
  - `isRequired(field)` tells whether the definition makes a field required.
  - `findField`, `allFields` and `dotPathOf` find fields by their dot path, to place them on their own.
  - `build<TInput, TOutput>(json)` returns the same schema typed by your types, as a `TypedJsonFormSchema<TInput, TOutput>`, so Formisch checks paths and values. `JsonFormSchema` names what `build(json)` returns.

  The new "Using with Formisch" section of the README shows a whole React renderer, and what Vue does differently.

## 0.10.0

### Minor Changes

- [#23](https://github.com/whatsaaaa/form-builder/pull/23) [`4237cef`](https://github.com/whatsaaaa/form-builder/commit/4237cef3b8010fe45a1ea49a1c12ab4f7a890259) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - Bug fixes from a code quality review, and stricter checks for definitions that built a broken schema.

  **Stricter validation.** `validate()` and `build()` now report these, so a definition that 0.9.0 accepted can fail:

  - An unknown key on the definition itself is `unknown_key`, like on a field. A misspelled `formrules` used to be ignored, so its form rules never ran. A definition takes `version`, `fields`, `formRules` and `$schema`.
  - A `default` on a display element (`heading`, `paragraph`, `divider`) is `invalid_shape`, like `rules` and `required`. Both `getInitialInput` functions now leave display elements out.
  - The names `*` and `__proto__` are `invalid_name`. Form rule paths read the items of a list with `*`, so a rule on a field named `*` never ran, and a field named `__proto__` built a schema that rejected every value.
  - An array's `of` that is no field, like `null`, is `invalid_shape`. It used to build a list of empty objects.
  - Unknown keys named `constructor`, `prototype` or `__proto__` on a field, rule or form rule are reported like any other unknown key.
  - `ui` must be an object. An array was accepted.

  **Fixes.**

  - `sameAs`, `differentFrom` and `compare` compare a date with `output: 'date'` and a date without it by their time. They used to compare the `Date` with the ISO string, so equal dates differed.
  - `validate()` no longer adds a second, misleading issue: `invalid_default` on an array whose item field has issues, or `kind_mismatch` for a multiselect's rules while its options have issues.
  - `resolveMessage` is called with the required message for required fields only.

  The code behind `validate()` is split into smaller functions, code that was written twice is shared, and the tests cover every line. The `isoTimestamp` rule's description shows the usual uppercase `Z`: `2026-10-28T14:30:15.000Z`.

## 0.9.0

### Minor Changes

- [#19](https://github.com/whatsaaaa/form-builder/pull/19) [`8384dd2`](https://github.com/whatsaaaa/form-builder/commit/8384dd25d7802355a8b110a928f2717e680e7205) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - The builder's `walkFields` gives each field its `kind`, e.g. `'number'`, or `'none'` for a display element, and `itemKind` for an array whose type has one, e.g. `'file'` for a multiple file field. Adapters use them to turn an input's `'5'` into `5`, and to tell a group from a repeater, your own container types included.

  ```ts
  for (const { dataPath, kind, itemKind } of builder.walkFields(json)) {
    // ['photos'], 'array', 'file'
  }
  ```

  The `walkFields` function, which needs no builder, leaves them out, and so does the builder for a field with issues.

## 0.8.0

### Minor Changes

- [#17](https://github.com/whatsaaaa/form-builder/pull/17) [`142421d`](https://github.com/whatsaaaa/form-builder/commit/142421d62d1630fa859dd7eed1810a0234387b0d) Thanks [@whatsaaaa](https://github.com/whatsaaaa)! - API review before 1.0: two exports change, rules can name their own category, and the builder can walk your own container types.

  **Breaking: `textUnitRules` is now `textRules`**, so every family export is its category plus `Rules`.

  ```ts
  // Before
  import { textUnitRules } from '@whatsaaaa/form-builder-schema'
  createSchemaBuilder({ includeDefaultRules: false, rules: { ...textUnitRules } })

  // After
  import { textRules } from '@whatsaaaa/form-builder-schema'
  createSchemaBuilder({ includeDefaultRules: false, rules: { ...textRules } })
  ```

  **Breaking: `KindOf` is no longer exported.** It only described the function form of a field type's `kind`, which you write inline. If you used it, use the field type's own type:

  ```ts
  // Before
  import type { KindOf } from '@whatsaaaa/form-builder-schema'
  const pickKind: KindOf<typeof props> = (field) => (field.big ? 'number' : 'string')

  // After
  import type { FieldTypeDef } from '@whatsaaaa/form-builder-schema'
  const pickKind: FieldTypeDef<typeof props>['kind'] = (field) => (field.big ? 'number' : 'string')
  ```

  **Own rule categories:** `RuleCategory` now takes any string besides the built-in ones, so your own rules can use `meta: { label: 'IBAN', category: 'banking' }`. Code that switches over every category should handle unknown ones.

  **Walking your own containers:** the builder now has `walkFields(json)` and `getInitialInput(json)`. They work like the functions of the same name, but read every container type the builder knows, not only `group` and `array`. For the built-in types they give the same results. They never throw; a container with issues isn't built, so the fields inside it are left out.

  **Form rule messages:** `JsonFormRule.message` stays required, now on purpose for format version 1. Without it, the error would be Valibot's generic "Invalid input".

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
