# @whatsaaaa/form-builder-schema

Build [Valibot](https://valibot.dev) schemas from JSON form definitions, ready to use with [Formisch](https://formisch.dev).

## Install

```sh
pnpm add @whatsaaaa/form-builder-schema valibot
```

Valibot 1.3 or later is required.

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
| `textUnitRules`   | `graphemes` `minGraphemes` `maxGraphemes` `notGraphemes`, `words` `minWords` `maxWords` `notWords`, `bytes` `minBytes` `maxBytes` `notBytes`                                                                                         | string                                                       | `value`; words also `locale`           |
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

The built-in `email` and `url` types use the `email` and `url` rules, so keep `formatRules` (or replace those types), or `createSchemaBuilder` throws a `TypeError`.

### Listing rules

Every built-in rule has `meta` with a `label`, a `category` and sometimes a `description`, for a rule picker. `rulesForKind(kind)` returns the `[name, def]` pairs that fit a kind:

```ts
const { rulesForKind } = createSchemaBuilder()
rulesForKind('file').map(([name, def]) => def.meta?.label) // ['Minimum size', …]
```

## Checking definitions

`validate(json)` never throws. It returns every problem in the definition, in document order:

```ts
const result = validate(jsonFromDatabase)
if (!result.success) {
  for (const issue of result.issues) console.log(formatPath(issue.path), issue.code, issue.message)
}
```

`build(json)` runs the same checks and throws one `DefinitionError` with all of them. Issue codes are `invalid_shape`, `unsupported_version`, `unknown_key`, `unknown_type`, `missing_name`, `invalid_name`, `duplicate_name`, `invalid_props`, `invalid_default`, `unknown_rule`, `unknown_param`, `invalid_params` and `kind_mismatch`. An issue in a nested field has its full path, such as `['fields', 2, 'fields', 0, 'rules', 1]`.

- **Names** are one key of the value, so a name with `.`, `[` or `]` is `invalid_name`.
- **Defaults** must pass the field's own schema, rules included, or they are `invalid_default`. An empty default, like `''`, counts as none.

Keys on a field must be reserved keys (`RESERVED_FIELD_KEYS`) or props of its type. Put renderer settings under `ui`, which is never checked.

## Extending

`createSchemaBuilder({ kinds, fieldTypes, rules })` merges your entries over the defaults by key. The merged registries are returned as `kinds`, `fieldTypes` and `rules`.

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
- A **field type** names the kind of its value. `kind` can also be a function of the field with its props parsed (`KindOf`), for a kind that depends on them, like a select's options. `itemKind` names the kind of each item of an array value: a rule for that kind but not for `array` then runs on each item, and reports its issues on the field. Two optional hooks fine-tune the pipeline: `required(message)` replaces the kind's required check (return `null` for none), and `finalize(field)` returns an action that runs after every rule, like `v.toDate()`.
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

## Messages

```ts
createSchemaBuilder({
  messages: { required: 'Obavezno' },
  resolveMessage: (key) => t(key), // every message from the definition, and messages.required
})
```

`resolveMessage` returning `undefined` keeps the text as written.

## License

MIT
