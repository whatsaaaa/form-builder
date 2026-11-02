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

Built-in field types are `text`, `email`, `password` and `number`. Empty optional fields output `undefined`. Rules never run on empty values, and a required empty field reports only the required message.

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

The built-in `email` type uses the `email` rule, so keep `formatRules` (or replace the `email` type), or `createSchemaBuilder` throws a `TypeError`.

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

`build(json)` runs the same checks and throws one `DefinitionError` with all of them. Issue codes are `invalid_shape`, `unsupported_version`, `unknown_key`, `unknown_type`, `missing_name`, `duplicate_name`, `invalid_props`, `unknown_rule`, `unknown_param`, `invalid_params` and `kind_mismatch`.

Keys on a field must be reserved keys (`RESERVED_FIELD_KEYS`) or props of its type. Put renderer settings under `ui`, which is never checked.

## Extending

`createSchemaBuilder({ kinds, fieldTypes, rules })` merges your entries over the defaults by key. The merged registries are returned as `kinds`, `fieldTypes` and `rules`.

```ts
const select = defineFieldType({
  kind: 'string',
  props: v.object({ options: v.array(v.string()) }),
  schema: (field) => v.picklist(field.options), // field.options is typed
})

const even = defineRule({
  kinds: ['number'],
  create: (_, message) => v.check((n: number) => n % 2 === 0, message),
})

const { build } = createSchemaBuilder({ fieldTypes: { select }, rules: { even } })
```

- A **kind** says what "empty" means for a value (`isEmpty`) and adds an optional extra `required` check. Built-in kinds are `string`, `number`, `boolean`, `date`, `array`, `file`, `object` and `none`. A type with kind `none` has no value, like a heading.
- A **rule** with `stage: 'normalize'` runs before the required check. Its `params` schema lists the only keys the rule accepts. `params` can also be a function of the field's kind, for params whose type depends on it:

  ```ts
  const atLeast = defineRule({
    kinds: ['number', 'date'],
    params: (kind) => v.object({ value: kind === 'date' ? v.string() : v.number() }),
    meta: { label: 'At least', category: 'comparison' },
    create: (params, message) => v.minValue(params.value, message),
  })
  ```

- Mistakes in the registry, such as an unknown kind or a reserved props key, throw a `TypeError` from `createSchemaBuilder`.

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
