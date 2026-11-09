# @whatsaaaa/form-builder-schema

Build [Valibot](https://valibot.dev) schemas from JSON form definitions, ready to use with [Formisch](https://formisch.dev).

## Install

```sh
pnpm add @whatsaaaa/form-builder-schema valibot
```

Valibot 1.3 or later is required. To render forms, also add Formisch's package for your framework, which needs Valibot 1.4.1 or later (see [Using with Formisch](#using-with-formisch)). To make a JSON Schema for your own registries, also add `@valibot/to-json-schema` 1.6 or later (see [JSON Schema](#json-schema)).

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
const schema = build(json) // a Valibot schema of the whole form, ready for Formisch or v.parse
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
- **Dates stay ISO strings** by default. `output: 'date'` turns the value into a `Date` after every rule, so comparison rules still compare ISO strings. Neither has a time zone, so the `Date` is in local time: a `date` is local midnight of the picked day.
- **A required radio** accepts any option, `false` included. **A required multiselect** needs at least one item; add `minLength: 2` for "pick at least two". Rules for the options' kind, like `maxValue`, run on each item.
- **A checkbox group** is a `multiselect` with `ui: { widget: 'checkboxes' }`.
- **Files.** `accept` takes MIME types separated by commas, such as `image/png,image/jpeg`. A `File` only carries its MIME type, so extensions (`.pdf`) and wildcards (`image/*`) are `invalid_props`. With `multiple`, file rules like `maxSize` check each file and `maxLength` limits the count. The schema reads the `File` global only while parsing, so the package loads in SSR.

### Display elements

| Type        | Props                                    |
| ----------- | ---------------------------------------- |
| `heading`   | `text`, `level?` from 1 to 6 (default 2) |
| `paragraph` | `text`, plain text                       |
| `divider`   |                                          |

They need no `name`, add no output key, and can't have a `default`, `rules` or `required`. Their `text` can be an i18n key: renderers resolve it with the same function you pass as `resolveMessage`. Whether a paragraph renders markdown is up to the renderer.

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
- The fields a rule reads must have the same kind: `compare` on a number and a date is `kind_mismatch`. A date with `output: 'date'` holds a `Date`, which is compared by its time, also with a date that holds the ISO string.
- **Form rules live in the schema's pipe.** With form rules, `build()` gives the object schema of the fields in a `v.pipe()` with one check per rule, and its type, `JsonFormSchema`, says so. A new object made from `schema.entries`, as with `v.pick()`, `v.omit()` or `v.object({ ...schema.entries })`, leaves the form rules out: pipe it with the checks from `schema.pipe` too.

## Checking definitions

`validate(json)` never throws. It returns every problem in the definition, in document order:

```ts
const result = validate(jsonFromDatabase)
if (!result.success) {
  for (const issue of result.issues) console.log(formatPath(issue.path), issue.code, issue.message)
}
```

`build(json)` runs the same checks and throws one `DefinitionError` with all of them. Issue codes are `invalid_shape`, `unsupported_version`, `unknown_key`, `unknown_type`, `missing_name`, `invalid_name`, `duplicate_name`, `invalid_props`, `invalid_default`, `unknown_rule`, `unknown_param`, `invalid_params`, `kind_mismatch` and `unknown_field`. An issue in a nested field has its full path, such as `['fields', 2, 'fields', 0, 'rules', 1]`.

- **Names** are one key of the value, so a name with `.`, `[` or `]` is `invalid_name`, and so are `*`, which paths use for the items of a list, and `__proto__`, which no object can hold as a key.
- **Defaults** must pass the field's own schema, rules included, or they are `invalid_default`. An empty default, like `''`, counts as none.
- **Form rules** report on `['formRules', 0]` and below. A `field` path that names no field with a value is `unknown_field` on `['formRules', 0, 'field']`, and a path the rule reads gets it on `['formRules', 0]`. When a field the rule reads has issues of its own, the rule adds none.

Keys on a field must be reserved keys (`RESERVED_FIELD_KEYS`) or props of its type. Put renderer settings under `ui`, an object that is never checked. A definition itself takes `version`, `fields`, `formRules` and `$schema`, which is allowed and never read. Any other key, on a field or on the definition, is `unknown_key`.

## Using with Formisch

The schema works with Formisch's own package for any framework: Vue, React, Preact, Solid, Svelte, Qwik and Angular. You don't need an adapter from this repo. For Vue, [`@whatsaaaa/form-builder-vue`](https://github.com/whatsaaaa/form-builder/tree/main/frameworks/vue) does everything below for you, with a component of yours for each field type.

```sh
pnpm add @whatsaaaa/form-builder-schema @formisch/react valibot
```

Every Formisch package needs Valibot 1.4.1 or later, newer than the 1.3 this package needs on its own.

One builder gives Formisch the schema and the initial input, and you the fields to render:

```ts
const builder = createSchemaBuilder()

const form = useForm({ schema: builder.build(json), initialInput: builder.getInitialInput(json) })
const fields = builder.getFieldTree(json)
```

Use the same builder for all of it, so your own types and rules count everywhere. `getFieldTree` throws a `DefinitionError` like `build`, so run `validate()` first when the definition comes from outside your code.

### Rendering by role

`getFieldTree` gives the definition's fields as a tree of `FieldNode`s, in the order of the definition. Render each one by its `role`, so your own types render too:

| Role      | Which fields                   | Render                                                                      |
| --------- | ------------------------------ | --------------------------------------------------------------------------- |
| `value`   | every field with a value       | a control, connected to Formisch's field at the node's path                 |
| `group`   | a container of kind `object`   | its `children`, e.g. in a `<fieldset>`                                      |
| `array`   | a container of kind `array`    | Formisch's field array at the node's path, and its `children` for each item |
| `display` | a display element, kind `none` | `field.text`. It has no Formisch field                                      |

A node has `field`, the field as the definition has it, with its `label`, `placeholder`, `options` and `ui`, and its `type`, `role`, `kind`, `itemKind`, `dataPath` and `children`.

**Paths.** `dataPath` has `'*'` for each array index: `['lines', '*', 'qty']`. `toFieldPath(node.dataPath, indexes)` puts in the index of each item the field is in, outermost first, and gives the path Formisch takes: `['lines', 0, 'qty']`. Pass the indexes down as you render the items. The path comes from the definition at runtime, so Formisch's types can't check it: pass it `as never`.

A whole renderer for React looks like this. Other frameworks have the same shape:

```tsx
import {
  Form,
  type FormStore,
  insert,
  remove,
  type SubmitHandler,
  useField,
  useFieldArray,
  useForm,
} from '@formisch/react'
import {
  coerceInput,
  createSchemaBuilder,
  type FieldNode,
  isRequired,
  type JsonForm,
  type JsonFormSchema,
  toFieldPath,
} from '@whatsaaaa/form-builder-schema'
import { useState } from 'react'

const builder = createSchemaBuilder()

export function JsonFormView(props: { json: JsonForm; onSubmit: SubmitHandler<JsonFormSchema> }) {
  // Formisch reads its config once, so read the definition once too.
  const [{ fields, ...config }] = useState(() => ({
    schema: builder.build(props.json),
    initialInput: builder.getInitialInput(props.json),
    fields: builder.getFieldTree(props.json),
  }))
  const form = useForm(config)
  return (
    <Form of={form} onSubmit={props.onSubmit}>
      <Fields form={form} nodes={fields} indexes={[]} />
      <button type="submit">Save</button>
    </Form>
  )
}

interface FieldsProps {
  form: FormStore
  nodes: readonly FieldNode[]
  /** The index of each array item the fields are in, outermost first. */
  indexes: readonly number[]
}

function Fields({ form, nodes, indexes }: FieldsProps) {
  return nodes.map((node, position) => {
    const key = node.field.name ?? `#${position}`
    switch (node.role) {
      case 'display':
        return <Display key={key} node={node} />
      case 'group':
        return (
          <fieldset key={key}>
            <legend>{node.field.label ?? node.field.name}</legend>
            <Fields form={form} nodes={node.children} indexes={indexes} />
          </fieldset>
        )
      case 'array':
        return <ArrayField key={key} form={form} node={node} indexes={indexes} />
      case 'value':
        return <ValueField key={key} form={form} node={node} indexes={indexes} />
    }
  })
}

function Display({ node }: { node: FieldNode }) {
  const text = String(node.field.text ?? '')
  if (node.type === 'heading') {
    const Heading = `h${Number(node.field.level ?? 2)}` as 'h2'
    return <Heading>{text}</Heading>
  }
  return node.type === 'paragraph' ? <p>{text}</p> : <hr />
}

interface FieldProps {
  form: FormStore
  node: FieldNode
  indexes: readonly number[]
}

function ArrayField({ form, node, indexes }: FieldProps) {
  // The path comes from the definition at runtime, so Formisch's types can't check it.
  const path = toFieldPath(node.dataPath, indexes) as never
  const array = useFieldArray(form, { path })
  const add = () => insert(form, { path, initialInput: builder.getItemInput(node.field) as never })
  return (
    <fieldset>
      <legend>{node.field.label ?? node.field.name}</legend>
      {array.items.map((item, index) => (
        <div key={item}>
          <Fields form={form} nodes={node.children} indexes={[...indexes, index]} />
          <button type="button" onClick={() => remove(form, { path, at: index })}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={add}>
        Add
      </button>
      {array.errors && <small>{array.errors[0]}</small>}
    </fieldset>
  )
}

function ValueField({ form, node, indexes }: FieldProps) {
  const store = useField(form, { path: toFieldPath(node.dataPath, indexes) as never })
  // Turns what the element gives into the field's value, e.g. '5' into 5 for a number.
  const set = (input: unknown) => store.onChange(coerceInput(input, node) as never)
  return (
    <label>
      <span>
        {node.field.label ?? node.field.name}
        {isRequired(node.field) && ' *'}
      </span>
      {/* One control for every type here. See "Controls" for the right one for each. */}
      <input
        {...store.props}
        type={node.kind === 'number' ? 'number' : 'text'}
        value={(store.input as string | number | undefined) ?? ''}
        placeholder={node.field.placeholder}
        onChange={(e) => set(e.target.value)}
      />
      {store.errors && <small>{store.errors[0]}</small>}
    </label>
  )
}
```

- **Arrays.** `builder.getItemInput(node.field)` is the input of a new item, with the defaults its fields have in the definition: an object for an array with `fields`, or the default of its `of` field. Key each item by its id from Formisch's `items`, so it keeps its inputs when another one is removed. `remove`, `move` and `swap` work as in any Formisch form.
- **Errors.** Show each field's `errors`, and an array's own, like a required array's message, from its field array. Form rules need no wiring: their issues have the path of the field they name, so Formisch shows them on that field, and on that field of each array item.
- **Required fields.** `isRequired(node.field)` is true when the definition makes a field required, with `required: true` or `{ message }`, e.g. to show an asterisk. The schema checks it: Formisch's `<Form>` turns the browser's own checks off.

Vue has the same shape, but its components set up once. Pass the path as a getter, so a field follows its item when one before it is removed, and the same for `useFieldArray`:

```vue
<script setup lang="ts">
import { type FormStore, useField } from '@formisch/vue'
import {
  coerceInput,
  type FieldNode,
  isRequired,
  toFieldPath,
} from '@whatsaaaa/form-builder-schema'

const props = defineProps<{ form: FormStore; node: FieldNode; indexes: readonly number[] }>()

const store = useField(props.form, () => ({
  path: toFieldPath(props.node.dataPath, props.indexes) as never,
}))
const set = (input: unknown) => {
  store.input = coerceInput(input, props.node) as never
}
</script>

<template>
  <label>
    <span>{{ node.field.label ?? node.field.name }}{{ isRequired(node.field) ? ' *' : '' }}</span>
    <input
      v-bind="store.props"
      :type="node.kind === 'number' ? 'number' : 'text'"
      :value="(store.input as string | number | undefined) ?? ''"
      @input="set(($event.target as HTMLInputElement).value)"
    />
    <small v-if="store.errors">{{ store.errors[0] }}</small>
  </label>
</template>
```

### Setting values

An element doesn't always give what the schema expects: an `<input type="number">` gives `'5'`, and a file input gives a `FileList`. `coerceInput(input, node)` turns it into the value of the field's kind:

| Kind                | Input                   | Value                          |
| ------------------- | ----------------------- | ------------------------------ |
| `number`            | `''` or only spaces     | `undefined`                    |
| `number`            | a numeric string, `'5'` | `5`                            |
| `file`              | a `FileList`            | its first file, or `undefined` |
| `array` of `file`   | a `FileList`            | an array of its files          |
| `array` of `number` | numeric strings         | numbers                        |

Anything else is passed as it is, and the schema reports it. Spread Formisch's element props (`store.props`) for the field's name, focus and blur, and set the value yourself from your change handler: with the field store's setter, like `store.onChange(value)` in React or `store.input = value` in Vue, or with `setInput(form, { path, input })`, which every Formisch package has.

### Controls

Every type has a native control. Pick it by the field's `type`, and by `ui.widget` if your definitions use it:

| Type                                                                | Control                                                                |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `text`, `email`, `password`, `url`, `tel`, `number`, `date`, `time` | `<input>` with the same `type`                                         |
| `datetime`                                                          | `<input type="datetime-local">`                                        |
| `textarea`                                                          | `<textarea>`                                                           |
| `checkbox`                                                          | `<input type="checkbox">`: set `e.target.checked`                      |
| `select`, `radio`                                                   | `<select>` or radios, from `field.options`                             |
| `multiselect`                                                       | `<select multiple>`, or checkboxes with `ui: { widget: 'checkboxes' }` |
| `file`                                                              | `<input type="file">`, with `multiple` when its kind is `array`        |

**Choices.** An element's value is always a string, so set the option's own value from `field.options`: that keeps `2` a number and `false` a boolean. Make each option's index the element's value:

```tsx
const options = node.field.options as { value: string | number | boolean; label: string }[]

<select
  {...store.props}
  value={options.findIndex((option) => option.value === store.input)}
  onChange={(e) => set(options[Number(e.target.value)]?.value)}
>
  <option value={-1}>Choose…</option>
  {options.map((option, i) => (
    <option key={i} value={i}>
      {option.label}
    </option>
  ))}
</select>
```

- A radio sets its option's value: `onChange={() => set(option.value)}`, with `checked={store.input === option.value}`.
- A multiselect's value is an array of option values. A checkbox adds its option's value or takes it out: `set(e.target.checked ? [...picked, option.value] : picked.filter((value) => value !== option.value))`. A `<select multiple>` sets the values of its `selectedOptions`, by their index.
- A `select` without `options`, because they load from an API, is a text input. Its kind is `number` with `valueType: 'number'`, so `coerceInput` turns what is typed into a number.

**Files.** Pass the element's `files`, and never set a file input's `value`:

```tsx
<input
  {...store.props}
  type="file"
  multiple={node.kind === 'array'}
  accept={node.field.accept as string | undefined}
  onChange={(e) => set(e.target.files)}
/>
```

### Placing fields

To render a field away from the others, say in a sidebar, find it by its dot path, and leave it out where you render the rest:

```ts
const coupon = findField(fields, 'coupon', { placed: true })
const rest = fields.filter((node) => dotPathOf(node) !== 'coupon')
```

- A dot path is the field's names joined with dots: `'address.city'`, or `'lines.*.qty'` for a field of an array's items. `dotPathOf(node)` gives a node's, and undefined for a display element or the field of a list of single values, which have no name.
- A path that names no field throws a `TypeError`, so a typo shows up at once. With `placed: true`, so does a field of an array's items, which has no index outside its item: place the array instead.
- `allFields(fields)` gives every node of the tree, in the order of the definition, a container before its fields.

### Typing the form

The definition is data, so TypeScript doesn't know its fields: the output is an object of `unknown` values, and Formisch's own functions take only top-level paths. Give `build` your input type, and your output type when it differs, and Formisch checks paths and values as in any form:

```ts
interface SignupInput {
  email: string
  address: { city?: string }
}

const form = useForm({
  schema: builder.build<SignupInput>(json),
  initialInput: builder.getInitialInput(json),
})

getInput(form, { path: ['address', 'city'] }) // string | undefined
```

- It is the same schema, typed as `TypedJsonFormSchema<TInput, TOutput>`. An interface works as the type, which Formisch's own constraint wouldn't take as it is. Your submit handler gets the output type.
- The types are a promise you make: nothing checks them against the definition. Keep the two in step.
- Paths from the field tree still need `as never`. Without your types, the schema is a `JsonFormSchema`.

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
- **The output type isn't inferred.** A field type's `schema()` returns any Valibot schema, so the definition doesn't say what type its value has. `v.InferOutput<typeof schema>` stays an object of `unknown` values. Inferring it would need every field type to declare its output type, so for now, give `build` your types: see [Typing the form](#typing-the-form).

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
- To render the fields, the builder's `getFieldTree` gives more: each field's role, kinds and children. See [Using with Formisch](#using-with-formisch).

With your own container types, use the builder's methods of the same name instead. They read every container the builder knows, and give the same results for the built-in ones:

```ts
const { build, getInitialInput, walkFields } = createSchemaBuilder({ fieldTypes: { section } })

const form = useForm({ schema: build(json), initialInput: getInitialInput(json) })
```

- A container of kind `object` gives an object of its fields' input, and one of kind `array` without a default gives `[]`.
- They never throw. A container with issues isn't built, so the fields inside it are left out of both, and a field with issues is left out of the initial input. A field whose only issue is its default still gets that default.

## Messages

```ts
createSchemaBuilder({
  messages: { required: 'Obavezno' },
  resolveMessage: (key) => t(key), // every message, label and description, and messages.required for required fields
})
```

`resolveMessage` returning `undefined` keeps the text as written.

## License

MIT
