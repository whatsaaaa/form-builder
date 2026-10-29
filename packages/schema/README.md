# @whatsaaaa/form-builder-schema

Build [Valibot](https://valibot.dev) schemas from JSON form definitions, ready to use with [Formisch](https://formisch.dev).

## Install

```sh
pnpm add @whatsaaaa/form-builder-schema valibot
```

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

Built-in field types are `text`, `email`, `password` and `number`. Built-in rules are `trim`, `minLength`, `maxLength`, `regex`, `email`, `url`, `minValue`, `maxValue` and `integer`. A rule without a `message` uses Valibot's message, so [`@valibot/i18n`](https://valibot.dev/guides/internationalization/) works.

Empty optional fields output `undefined`. Rules never run on empty values, and a required empty field reports only the required message. `trim` runs before the required check, so `'   '` counts as empty.

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
- A **rule** with `stage: 'normalize'` runs before the required check. Its `params` schema lists the only keys the rule accepts.
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
