# @whatsaaaa/form-builder-schema

Build [Valibot](https://valibot.dev) schemas from JSON form definitions, ready to use with [Formisch](https://formisch.dev).

## Install

```sh
pnpm add @whatsaaaa/form-builder-schema valibot
```

Valibot 1.3 or later is required. To make a JSON Schema for your own registries, also add `@valibot/to-json-schema` 1.6 or later (see [JSON Schema](#json-schema)).

## Usage

```ts
import { createSchemaBuilder, type JsonForm } from '@whatsaaaa/form-builder-schema'

const json: JsonForm = {
  version: '1',
  fields: [
    { name: 'email', type: 'email', label: 'Email', required: { message: 'Email is required' } },
    {
      name: 'password',
      type: 'password',
      required: true,
      rules: [{ rule: 'minLength', value: 10, message: 'At least 10 characters' }],
    },
  ],
}

const { build, validate } = createSchemaBuilder()
const schema = build(json) // v.ObjectSchema, ready for Formisch or v.parse
```

Empty optional fields output `undefined`. Rules never run on empty values, and a required empty field reports only the required message.

Each field's schema carries its `label` as `v.title()` and its `description` as `v.description()`, both through `resolveMessage`. So `v.getTitle(schema.entries.email)` is `'Email'`, for renderers and other tools that only have the schema.

## Field types

There is a type for every native control, two types that hold other fields, and three display elements. Anything more specific is a `ui.widget` variant of one of them, or your own type: a star rating is a `number` with `ui: { widget: 'rating' }`, and a colour picker is a `text` with a `hexColor` rule.

| Type                                  | Kind                                   | Value                               | Props                    | Checks                           |
| ------------------------------------- | -------------------------------------- | ----------------------------------- | ------------------------ | -------------------------------- |
| `text`, `textarea`, `password`, `tel` | string                                 | `string`                            |                          |                                  |
| `email`, `url`                        | string                                 | `string`                            |                          | the `email` or `url` rule        |
| `number`                              | number                                 | `number`                            |                          |                                  |
| `checkbox`                            | boolean                                | `boolean`                           |                          | required means ticked            |
| `date`                                | date                                   | `'2026-10-28'`                      | `output?`                | ISO date                         |
| `time`                                | date                                   | `'14:30'`                           |                          | ISO time                         |
| `datetime`                            | date                                   | `'2026-10-28T14:30'`                | `output?`                | ISO date and time                |
| `select`                              | from the options                       | `string \| number`                  | `options?`, `valueType?` | one of the options               |
| `radio`                               | from the options                       | `string \| number \| boolean`       | `options`                | one of the options               |
| `multiselect`                         | array, items from the options          | `(string \| number)[]`              | `options`                | every item is one of the options |
| `file`                                | file, or array of file with `multiple` | `File`, or `File[]` with `multiple` | `multiple?`, `accept?`   | MIME type from `accept`          |

- **Options** are `{ value, label }[]`: at least one, every value different and of the same type. A select with number options has kind `number`, so it rejects `'1'` and takes rules like `minValue`.
- **A select without `options`**, because they load from an API, takes any value of its `valueType` (`'string'`, the default, or `'number'`). With `options`, `valueType` is ignored.
- **Dates stay ISO strings** by default. `output: 'date'` turns the value into a `Date` after every rule, so comparison rules still compare ISO strings. A `datetime` has no time zone, so its `Date` is in local time.
- **A required radio** accepts any option, `false` included. **A required multiselect** needs at least one item; add `minLength: 2` for "pick at least two". Rules for the options' kind, like `maxValue`, run on each item.
- **A checkbox group** is a `multiselect` with `ui: { widget: 'checkboxes' }`.
- **Files.** `accept` takes MIME types separated by commas, such as `image/png,image/jpeg`. A `File` only carries its MIME type, so extensions (`.pdf`) and wildcards (`image/*`) are `invalid_props`. With `multiple`, file rules like `maxSize` check each file and `maxLength` limits the count. The schema reads the `File` global only while parsing, so the package loads in SSR.

### Display elements

| Type        | Props                                    |
| ----------- | ---------------------------------------- |
| `heading`   | `text`, `level?` from 1 to 6 (default 2) |
| `paragraph` | `text`, plain text                       |
| `divider`   |                                          |

They need no `name`, add no output key, and can't have `rules` or `required`. Their `text` can be an i18n key: renderers resolve it with the same function you pass as `resolveMessage`. Whether a paragraph renders markdown is up to the renderer.

### Groups and arrays

| Type    | Kind   | Value                                  | Props                            |
| ------- | ------ | -------------------------------------- | -------------------------------- |
| `group` | object | an object with a key for each field    | `fields`                         |
| `array` | array  | a list of single values, or of objects | exactly one of `of` and `fields` |

```json
{
  "name": "address",
  "type": "group",
  "fields": [
    { "name": "city", "type": "text", "required": true },
    { "name": "zip", "type": "text" }
  ]
}
```

- **A group** builds `{ address: { city, zip } }`, so Formisch's path for the city is `['address', 'city']`. It is always there and its fields decide what is required, so it can't have `required` or `default`.
- **An array with `of`** is a list of single values, such as tags. `of` is the field each item uses, and it needs no `name`. **An array with `fields`** is a list of objects, such as order lines.
- **Rules on an array**, like `minLength`, count its items. A required array needs at least one item. A missing array is read as `[]`, so its rules still run.
- Display elements can go inside both. A name only has to be unique among the fields next to it.

## Rules

Every Valibot action whose arguments fit in JSON is a rule with the same name. Params go next to `rule`, and a rule without a `message` uses Valibot's message, so [`@valibot/i18n`](https://valibot.dev/guides/internationalization/) works.

```json
{ "rule": "minLength", "value": 3, "message": "At least 3 characters" }
```

| Family            | Rules                                                                                                                                                                                                                                | Kinds                                                        | Params                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------- |
| `lengthRules`     | `length` `minLength` `maxLength` `notLength`                                                                                                                                                                                         | string, array                                                | `value`                                |
| `textRules`       | `graphemes` `minGraphemes` `maxGraphemes` `notGraphemes`, `words` `minWords` `maxWords` `notWords`, `bytes` `minBytes` `maxBytes` `notBytes`                                                                                         | string                                                       | `value`; words also `locale`           |
| `contentRules`    | `regex` `startsWith` `endsWith` `includes` `excludes`                                                                                                                                                                                | string; `includes` and `excludes` also array                 | `pattern` and `flags`, or `value`      |
| `formatRules`     | `email` `rfcEmail` `url` `domain` `slug` `uuid` `ulid` `cuid2` `nanoid` `ip` `ipv4` `ipv6` `mac` `mac48` `mac64` `hexColor` `hexadecimal` `octal` `decimal` `digits` `base64` `bic` `creditCard` `imei` `isbn` `isrc` `emoji` `hash` | string                                                       | none; `hash` takes `types`             |
| `dateRules`       | `isoDate` `isoDateTime` `isoTime` `isoTimeSecond` `isoTimestamp` `isoWeek`                                                                                                                                                           | string, date                                                 | none                                   |
| `comparisonRules` | `minValue` `maxValue` `gtValue` `ltValue` `value` `notValue` `values` `notValues`                                                                                                                                                    | number, date; `value` and `notValue` also string and boolean | `value` or `values`, typed by the kind |
| `numberRules`     | `integer` `safeInteger` `finite` `multipleOf`                                                                                                                                                                                        | number                                                       | `multipleOf` takes `value`             |
| `fileRules`       | `minSize` `maxSize` `size` `notSize` `mimeType`                                                                                                                                                                                      | file                                                         | `value` in bytes, or `types`           |
| `normalizeRules`  | `trim` `trimStart` `trimEnd` `toLowerCase` `toUpperCase` `normalize`, `toMinValue` `toMaxValue`                                                                                                                                      | string; `toMinValue` and `toMaxValue` on number              | none; `form`, or `value`               |

- **Normalize rules** change the value instead of checking it, and run before the required check. With `trim`, `'   '` counts as empty.
- **`regex`** takes `pattern` (without slashes) and optional `flags`. A pattern `RegExp` rejects is an `invalid_params` issue. `g` and `y` are accepted but ignored, because they make a regex skip ahead on the next value. If end users write patterns, beware of [ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS): a pattern like `(a+)+$` can freeze the page.
- **Comparing dates.** On a `date` field, `value` must be an ISO date, date-time or time string. Valibot compares them as text, so use the same format as the field: `'2026-01-01'` for a date, `'2026-01-01T09:00'` for a date-time.
- **`words`** splits text by language. Without `locale`, the runtime's default locale is used.
- Function-based actions (`check`, `transform`, …) can't be written in JSON. Register them as your own rules with `defineRule`.

### Registering only some rules

```ts
import { createSchemaBuilder, formatRules, lengthRules } from '@whatsaaaa/form-builder-schema'

const { build } = createSchemaBuilder({
  includeDefaultRules: false,
  rules: { ...formatRules, ...lengthRules },
})
```

The built-in `email` and `url` types use the `email` and `url` rules, so keep `formatRules` (or replace those types), or `createSchemaBuilder` throws a `TypeError`. `includeDefaultRules: false` leaves out the built-in form rules too; add them back with `formRules: defaultFormRules`.

### Listing rules

Every built-in rule has `meta` with a `label`, a `category` and sometimes a `description`, for a rule picker. Your own rules can use a built-in category or a new one, so a picker should group unknown categories too. `rulesForKind(kind)` returns the `[name, def]` pairs that fit a kind:

```ts
const { rulesForKind } = createSchemaBuilder()
rulesForKind('file').map(([name, def]) => def.meta?.label) // ['Minimum size', …]
```

## Form rules

A form rule checks a field against other fields, such as a repeated password or a date range. Form rules go in `formRules`, next to `fields`, and each one names the `field` its error shows on:

```json
{
  "version": "1",
  "fields": [
    { "name": "password", "type": "password", "required": true },
    { "name": "password2", "type": "password", "required": true },
    { "name": "start", "type": "date" },
    { "name": "end", "type": "date" }
  ],
  "formRules": [
    { "rule": "sameAs", "field": "password2", "other": "password", "message": "Passwords differ" },
    {
      "rule": "compare",
      "field": "end",
      "op": "gt",
      "other": "start",
      "message": "After the start"
    }
  ]
}
```

| Rule            | Params                                     | Kinds                         | Passes when       |
| --------------- | ------------------------------------------ | ----------------------------- | ----------------- |
| `sameAs`        | `other`                                    | string, number, boolean, date | `field === other` |
| `differentFrom` | `other`                                    | string, number, boolean, date | `field !== other` |
| `compare`       | `op` (`lt`, `lte`, `gt` or `gte`), `other` | number, date                  | `field op other`  |

- **Paths** name fields by their value: `'password2'`, `'address.zip'` for a field in a group, and `'lines.*.qty'` for a field in the items of an array. A rule on a path with `*` runs once per item, and its error shows on that item's field. A path it reads with `*` means the same item, so `{ "field": "lines.*.qty", "op": "lte", "other": "lines.*.stock" }` compares each line with itself.
- **A form rule runs last**, after every field's own rules, and only when the fields it reads have no issues. So a password that is too short never also shows "Passwords differ". It never runs on an empty value either: make the fields required when they must be filled.
- **`message` is required**, unlike on a field's rules. Without it, the error would be Valibot's generic "Invalid input", which says nothing about the other field. It goes through `resolveMessage` like every other message, with the rule's field in `ctx.field`.
- The fields a rule reads must have the same kind: `compare` on a number and a date is `kind_mismatch`. A date with `output: 'date'` is compared by its time, so compare it with another date that has `output: 'date'`.

## Checking definitions

`validate(json)` never throws. It returns every problem in the definition, in document order:

```ts
const result = validate(jsonFromDatabase)
if (!result.success) {
  for (const issue of result.issues) console.log(formatPath(issue.path), issue.code, issue.message)
}
```

`build(json)` runs the same checks and throws one `DefinitionError` with all of them. Issue codes are `invalid_shape`, `unsupported_version`, `unknown_key`, `unknown_type`, `missing_name`, `invalid_name`, `duplicate_name`, `invalid_props`, `invalid_default`, `unknown_rule`, `unknown_param`, `invalid_params`, `kind_mismatch` and `unknown_field`. An issue in a nested field has its full path, such as `['fields', 2, 'fields', 0, 'rules', 1]`.

- **Names** are one key of the value, so a name with `.`, `[` or `]` is `invalid_name`.
- **Defaults** must pass the field's own schema, rules included, or they are `invalid_default`. An empty default, like `''`, counts as none.
- **Form rules** report on `['formRules', 0]` and below. A `field` path that names no field with a value is `unknown_field` on `['formRules', 0, 'field']`, and a path the rule reads gets it on `['formRules', 0]`. When a field the rule reads has issues of its own, the rule adds none.

Keys on a field must be reserved keys (`RESERVED_FIELD_KEYS`) or props of its type. Put renderer settings under `ui`, which is never checked. `$schema` at the top of a definition is allowed and never read.

## Writing definitions in TypeScript

`defineForm` types a definition against the builder's registries, your own types and rules included. It returns the definition unchanged:

```ts
const money = defineFieldType({
  kind: 'number',
  props: v.object({ currency: v.picklist(['EUR', 'RSD']) }),
  schema: () => v.number(),
})

const { defineForm, build } = createSchemaBuilder({ fieldTypes: { money } })

const form = defineForm({
  version: '1',
  fields: [
    { name: 'email', type: 'email', rules: [{ rule: 'maxLength', value: 120 }] },
    { name: 'price', type: 'money', currency: 'EUR' }, // currency is typed by money's props
  ],
})

const schema = build(form)
```

- **Compile errors:** an unknown `type`, `rule` or form rule, a key that is neither reserved nor a prop, and a prop or param of the wrong type, such as `value: '120'`. Child fields of groups and arrays are checked the same way.
- **Not checked:** whether a rule fits the field's kind, names, defaults and form rule paths. Run `validate()` for those.
- The builder knows your entries by key when you pass them in the options. Options typed as `SchemaBuilderOptions` have no known keys, so `defineForm` then takes any name.
- **The output type isn't inferred.** A field type's `schema()` returns any Valibot schema, so the definition doesn't say what type its value has. `v.InferOutput<typeof schema>` stays an object of `unknown` values. Inferring it would need every field type to declare its output type, so it isn't part of 0.7.

## JSON Schema

The package ships `definition.schema.json`, the JSON Schema (draft-07) of definitions for the default registries. Point a definition at it with `$schema`, and VS Code and other editors suggest types, rules and their params, and mark mistakes:

```json
{
  "$schema": "./node_modules/@whatsaaaa/form-builder-schema/definition.schema.json",
  "version": "1",
  "fields": [{ "name": "email", "type": "email" }]
}
```

For your own registries, make the schema with `toJsonSchema`. It needs the optional peer `@valibot/to-json-schema`, so it has its own entry:

```ts
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'

const builder = createSchemaBuilder({ fieldTypes: { money } })
writeFileSync('form.schema.json', JSON.stringify(toJsonSchema(builder), null, 2))
```

- **It checks** type names, the keys and props of each type, the rules that fit a type's kind and their params, and form rule names and params. `meta.label` and `meta.description` become each type's and rule's `title` and `description`.
- **It can't check** what only `validate()` does: duplicate names, defaults, form rule paths, and checks with no JSON Schema keyword, such as options having different values. Run `validate()` on definitions you store.
- A props or params schema that has no JSON Schema form, such as `v.custom()` or `v.instance()`, lets that type or rule take any keys, and `toJsonSchema` logs a warning.

## Reference

[Rules](docs/rules.md) and [field types](docs/field-types.md) list every built-in entry with its kinds, params, props and description. `pnpm docs:gen` writes them, and `definition.schema.json`, from the registry, and CI fails when they are out of date.

## Extending

`createSchemaBuilder({ kinds, fieldTypes, rules, formRules })` merges your entries over the defaults by key. The merged registries are returned as `kinds`, `fieldTypes`, `rules` and `formRules`.

```ts
const tags = defineFieldType({
  kind: 'array',
  itemKind: 'string',
  props: v.object({ max: v.optional(v.number()) }),
  schema: (field) => v.pipe(v.array(v.string()), v.maxLength(field.max ?? 10)), // field.max is typed
})

const even = defineRule({
  kinds: ['number'],
  create: (_, message) => v.check((n: number) => n % 2 === 0, message),
})

const { build } = createSchemaBuilder({ fieldTypes: { tags }, rules: { even } })
```

- A **kind** says what "empty" means for a value (`isEmpty`) and adds an optional extra `required` check. Built-in kinds are `string`, `number`, `boolean`, `date`, `array`, `file`, `object` and `none`. A type with kind `none` has no value, like a heading.
- A **field type** names the kind of its value. `kind` can also be a function of the field with its props parsed, for a kind that depends on them, like a select's options. `itemKind` names the kind of each item of an array value: a rule for that kind but not for `array` then runs on each item, and reports its issues on the field. Two optional hooks fine-tune the pipeline: `required(message)` replaces the kind's required check (return `null` for none), and `finalize(field)` returns an action that runs after every rule, like `v.toDate()`.
- A **rule** with `stage: 'normalize'` runs before the required check. Its `params` schema lists the only keys the rule accepts. `params` can also be a function of the field's kind, for params whose type depends on it:

  ```ts
  const atLeast = defineRule({
    kinds: ['number', 'date'],
    params: (kind) => v.object({ value: kind === 'date' ? v.string() : v.number() }),
    meta: { label: 'At least', category: 'comparison' },
    create: (params, message) => v.minValue(params.value, message),
  })
  ```

- A **field type whose value holds other fields** sets `container: true` and builds them with `ctx.buildFields(fields, path)`, or `ctx.buildField(field, path)` for the items of a list. The builder checks those fields like any others, so their issues have their full path. A container's kind is `object` or `array`, its value is never empty, and Formisch keeps a field for each child.
- To **test a field type on its own**, give its `schema()` a context from `createBuildContext()`. Its `buildFields` and `buildField` use the default registries and throw a `DefinitionError` when the child fields have issues:

  ```ts
  const schema = myType.schema?.(field, createBuildContext({ path: ['fields', 0] }))
  ```

- A **form rule** lists the paths it reads besides `field`, and checks their values with a plain function. The builder checks that the fields exist and have one of `kinds`, and runs `check` only when none of them has an issue or is empty:

  ```ts
  const sameZip = defineFormRule({
    params: v.object({ others: v.array(v.string()) }),
    reads: (params) => params.others,
    kinds: ['string'],
    check: (values) => new Set(values).size === 1, // the value of `field`, then the others
    meta: { label: 'Same ZIP', category: 'comparison' },
  })

  const { build } = createSchemaBuilder({ formRules: { sameZip } })
  ```

  `sameKind: true` requires every field it reads to have the same kind. `rule`, `field` and `message` are reserved (`RESERVED_FORM_RULE_KEYS`), so params can't use them.

- A field type's `meta` (`label` and an optional `description`) describes it to people, like a rule's. The JSON Schema and the docs use it.
- Mistakes in the registry, such as an unknown kind or a reserved props key, throw a `TypeError` from `createSchemaBuilder`.

## Initial input and walking fields

Two plain functions read a definition without a builder, for renderers and adapters:

```ts
import { getInitialInput, walkFields } from '@whatsaaaa/form-builder-schema'

const form = useForm({ schema: build(json), initialInput: getInitialInput(json) })

for (const { field, dataPath, definitionPath, depth } of walkFields(json)) {
  // e.g. dataPath ['lines', '*', 'quantity'], definitionPath ['fields', 2, 'fields', 1], depth 1
}
```

- `getInitialInput` gives each field's `default`, nested the way the value is. A group gives an object, and an array without a default gives `[]`. Other fields without a default are left out.
- `walkFields` yields every field at every depth, in document order, with a group or array before its fields. The fields of an array's items come once, with `'*'` in place of the index. A field without a name, like a heading, has its parent's `dataPath`.
- Both know the built-in `group` and `array` types only, and neither checks the definition, so run `validate()` first.

With your own container types, use the builder's methods of the same name instead. They read every container the builder knows, and give the same results for the built-in ones:

```ts
const { build, getInitialInput, walkFields } = createSchemaBuilder({ fieldTypes: { section } })

const form = useForm({ schema: build(json), initialInput: getInitialInput(json) })
```

- A container of kind `object` gives an object of its fields' input, and one of kind `array` without a default gives `[]`.
- They never throw. A container with issues isn't built, so the fields inside it are left out of both, and a field with issues is left out of the initial input.

## Messages

```ts
createSchemaBuilder({
  messages: { required: 'Obavezno' },
  resolveMessage: (key) => t(key), // every message, label and description, and messages.required
})
```

`resolveMessage` returning `undefined` keeps the text as written.

## License

MIT
