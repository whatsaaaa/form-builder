---
description: Check field values with rules, the Valibot actions that fit in JSON, and give them messages.
---

# Validation rules

Rules check a field's value, like a minimum length or an email format. Every Valibot action whose arguments fit in JSON is a rule with the same name. Below you will learn how to add rules, how they run, and how to register only the ones you need.

## Adding rules

A field's `rules` is a list. Each rule names a rule with `rule`, takes its params next to it, and can have a `message`:

```json
{
  "name": "username",
  "type": "text",
  "required": true,
  "rules": [
    { "rule": "trim" },
    { "rule": "minLength", "value": 3, "message": "At least 3 characters" },
    { "rule": "slug", "message": "Letters, digits and dashes only" }
  ]
}
```

A rule without a `message` reports Valibot's own message, so [`@valibot/i18n`](https://valibot.dev/guides/internationalization/) translates it. To translate your own messages, see [messages and i18n](/guide/messages).

A rule must fit the field's kind: `minLength` fits text and lists, `minValue` fits numbers and dates. A rule that doesn't fit, or a param of the wrong type, is an issue that [`validate()`](/guide/checking-definitions) reports.

## How rules run

A field's schema runs its parts in this order:

1. **Normalize rules**, like `trim` and `toLowerCase`, which change the value instead of checking it.
2. **The required check.** With `trim`, a value of only spaces counts as empty.
3. **The type's own rules**, like the `email` rule of an `email` field, then the field's rules, in order. A rule of the field with the same name as one of the type's replaces it, so `{ "rule": "email", "message": "..." }` on an `email` field [sets the message](/guide/field-types#text) of that check.
4. **The type's last step**, like turning an ISO string into a `Date` with `"output": "date"`.

Rules never run on an empty value. A required field that is empty reports only the required message, and one that isn't required outputs `undefined`.

## Rule families

The built-in rules come in families. Each family is exported on its own, for [registering only some rules](#registering-only-some-rules):

| Family            | Rules                                                                                                 | Kinds                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `lengthRules`     | `length`, `minLength`, `maxLength`, `notLength`                                                       | string, array                                                |
| `textRules`       | characters (`minGraphemes`, ...), words (`minWords`, ...) and bytes (`maxBytes`, ...)                 | string                                                       |
| `contentRules`    | `regex`, `startsWith`, `endsWith`, `includes`, `excludes`                                             | string; `includes` and `excludes` also array                 |
| `formatRules`     | `email`, `url`, `uuid`, `ip`, `hexColor`, `creditCard` and 22 more                                    | string                                                       |
| `dateRules`       | `isoDate`, `isoDateTime`, `isoTime`, `isoTimeSecond`, `isoTimestamp`, `isoWeek`                       | string, date                                                 |
| `comparisonRules` | `minValue`, `maxValue`, `gtValue`, `ltValue`, `value`, `notValue`, `values`, `notValues`              | number, date; `value` and `notValue` also string and boolean |
| `numberRules`     | `integer`, `safeInteger`, `finite`, `multipleOf`                                                      | number                                                       |
| `fileRules`       | `minSize`, `maxSize`, `size`, `notSize`, `mimeType`                                                   | file                                                         |
| `normalizeRules`  | `trim`, `trimStart`, `trimEnd`, `toLowerCase`, `toUpperCase`, `normalize`, `toMinValue`, `toMaxValue` | string; `toMinValue` and `toMaxValue` number                 |

The [built-in rules](/api/schema/rules) reference lists every rule with its kinds and params.

## Normalize rules

Normalize rules change the value, and the output has the change. `trim`, `toLowerCase` and the other string ones clean up text. `toMinValue` and `toMaxValue` replace a number outside a range with its edge, instead of reporting it:

```json
{
  "name": "age",
  "type": "number",
  "rules": [{ "rule": "toMaxValue", "value": 120 }]
}
```

## Patterns

`regex` takes a `pattern`, without the slashes, and optional `flags`:

```json
{
  "name": "vatId",
  "type": "text",
  "rules": [
    { "rule": "regex", "pattern": "^[A-Z]{2}[0-9A-Z]{8,12}$", "flags": "i" }
  ]
}
```

A pattern that JavaScript's `RegExp` rejects is an issue. The `g` and `y` flags are accepted but ignored, as they would make the pattern skip ahead on the next value.

::: warning
If end users write patterns, beware of [ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS): a pattern like `(a+)+$` can freeze the page.
:::

## Dates

On a `date`, `time` or `datetime` field, comparison rules take an ISO string. Valibot compares them as text, so use the same format as the field: `"2026-01-01"` for a date, `"2026-01-01T09:00"` for a date and time.

```json
{
  "name": "start",
  "type": "datetime",
  "rules": [
    {
      "rule": "minValue",
      "value": "2026-01-01T09:00",
      "message": "Opens on January 1 at 9:00"
    }
  ]
}
```

## Lists

On a list or a multiselect, length rules count the items. A rule for the kind of the items, like `maxValue` on a multiselect with number options, or `maxSize` on a file field with `multiple`, runs on each item, and reports on the field.

## Registering only some rules

A builder has every built-in rule. To offer fewer, for example in a visual editor, register the families you want with `includeDefaultRules: false`:

<<< @/snippets/schema/rules.ts#some

The built-in `email` and `url` types use the `email` and `url` rules, so keep `formatRules`, or replace those types, or `createSchemaBuilder` throws a `TypeError`. `includeDefaultRules: false` leaves out the built-in form rules too, so add them back with `formRules: defaultFormRules`.

## Listing rules

Every built-in rule has `meta` with a `label`, a `category`, and sometimes a `description`, for a rule picker. `rulesForKind()` gives the rules that fit a kind:

<<< @/snippets/schema/rules.ts#list

Rules of your own can use a built-in category or a new one, so a picker should group unknown categories too.

## Rules with code

Valibot actions that take a function, like `check` and `transform`, can't be written in JSON. Register them as rules of your own: see [custom rules](/guide/custom-rules).

## Next steps

Rules check one field. To check a field against others, like a repeated password, continue to [form rules](/guide/form-rules).
