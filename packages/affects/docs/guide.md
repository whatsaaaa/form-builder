# Guide to @whatsaaaa/form-builder-affects

Everything the affects package does, in one page: effects, conditions, what a hidden field does, checks and rendering. The [README](../README.md) has the overview.

Conditions for JSON form definitions of [`@whatsaaaa/form-builder-schema`](https://github.com/whatsaaaa/form-builder/tree/main/packages/schema): show, hide and clear fields, sections and steps by the values of other fields. A hidden field isn't validated, in every Formisch package and in a plain `v.parse`.

## Install

```sh
pnpm add @whatsaaaa/form-builder-affects @whatsaaaa/form-builder-schema valibot
```

## Usage

Give the schema builder the extension, and write `affects` on the fields:

```ts
import { affects } from '@whatsaaaa/form-builder-affects'
import { createSchemaBuilder, type JsonForm } from '@whatsaaaa/form-builder-schema'

const builder = createSchemaBuilder({ extensions: [affects()] })

const json: JsonForm = {
  version: '1',
  fields: [
    {
      name: 'accountType',
      type: 'radio',
      required: true,
      options: [
        { value: 'personal', label: 'Personal' },
        { value: 'business', label: 'Business' },
      ],
    },
    {
      name: 'vatId',
      type: 'text',
      required: true,
      affects: [{ effect: 'hideAndClear', when: { field: 'accountType', notEquals: 'business' } }],
    },
  ],
}

const schema = builder.build(json) // vatId is required only for a business account
```

With the [Vue](https://github.com/whatsaaaa/form-builder/tree/main/frameworks/vue) or [React](https://github.com/whatsaaaa/form-builder/tree/main/frameworks/react) adapter, pass the builder, and the hidden fields, sections and steps leave the form:

```ts
const jsonForm = useJsonForm(json, { builder, components })
```

Without the extension, `affects` is an unknown key: `validate()` reports it, and `build()` throws. A definition never runs without its conditions by mistake.

## Affects

`affects` is a list of effects, each with the condition that applies it:

| Effect         | While its condition is met                              |
| -------------- | ------------------------------------------------------- |
| `show`         | the field shows. Otherwise it is hidden, like `hide`    |
| `hide`         | the field is hidden, and keeps its value                |
| `hideAndClear` | the field is hidden, and its value cleared: it is blank |

- **Hide always wins.** A field is hidden when its `show` condition isn't met, or its `hide` or `hideAndClear` condition is. It is cleared only when its `hideAndClear` condition is met.
- **Each effect goes once on a field.** Join conditions with `all` or `any`. A field can have `show` with `hide` or `hideAndClear`.
- **Where:** any field in `fields`, at any depth, display elements, groups and arrays included, and the layout's steps, sections and display elements. Not on a row, nor on the `of` field of a list, which is the item itself: put them on the list.

## Conditions

```text
Condition = { "field": Path, Operator: Value }
          | { "all": [Condition, ...] }
          | { "any": [Condition, ...] }
```

A test reads one field, by its dot path, with exactly one operator. `all` and `any` take at least one condition, and nest to any depth.

| Operator    | Value                       | True when the field                                       |
| ----------- | --------------------------- | --------------------------------------------------------- |
| `equals`    | a string, number or boolean | holds the value                                           |
| `notEquals` | a string, number or boolean | doesn't hold the value, or is empty                       |
| `in`        | a list of at least one      | holds one of the values                                   |
| `includes`  | a string, number or boolean | is a multiselect or a list of values, and holds the value |
| `empty`     | `true`                      | is empty                                                  |
| `notEmpty`  | `true`                      | isn't empty                                               |

Paths are the paths of form rules: `isBusiness`, `billing.zip`, or `lines.*.kind` for the field of the **same item** of `lines`, from a field, section or display element inside its items. A path with an index, like `lines.0.kind`, or to an item's field from outside the items, is an issue. Nested lists bind a `*` to each item the field is in: `orders.*.lines.*.sku`.

### Operators by kind

| Kind                                                                   | `equals`, `notEquals`, `in` | `includes` | `empty`, `notEmpty` |
| ---------------------------------------------------------------------- | --------------------------- | ---------- | ------------------- |
| string, number, boolean, date (text, select, radio, checkbox, date...) | yes                         | no         | yes                 |
| array: a multiselect, or a list of values with `of`                    | no                          | yes        | yes                 |
| array: a list of objects with `fields`, or of files                    | no                          | no         | yes                 |
| file                                                                   | no                          | no         | yes                 |
| object: a group, which is never empty                                  | no                          | no         | no                  |
| your own kinds                                                         | no                          | no         | yes                 |

A value must be one the field can hold: its schema, rules included, takes it, like a `default`. So `{ "field": "country", "equals": "Germny" }` on a select is an issue, not a condition that is never met. A date is the ISO string the field takes: `"2026-11-09"`, `"14:30"`, `"2026-11-09T14:30"`.

- **Conditions read the input**, what the form holds now, turned the way a renderer sets it: `"5"` is `5` for a number. Normalize rules like `trim` aren't applied.
- **Empty** is the kind's empty, the one `required` uses: `undefined`, `''`, `[]`. An empty field never `equals` anything, and `notEquals` is true for it.
- **A checkbox nobody touched holds nothing**, not `false`. To show something while it isn't ticked, write `{ "notEquals": true }`, or give the checkbox `"default": false`. A required checkbox only takes `true`, so `{ "equals": false }` on one is an issue.

## What a hidden field does

- **It isn't validated:** no `required`, no rules, and no form rule that reads it, or is on it. A hidden list skips its own `required`, `minLength` and `maxLength` too. Formisch shows no error on it, and an old one goes at the next validation.
- **It counts as empty** in every other condition, so a chain follows: when `companyType` hides with the business account, a `vatId` shown for `companyType: "ltd"` hides too, though `companyType` still holds `"ltd"`.
- **A field `hideAndClear` hides is blank**: it submits `undefined`, a list `[]`, and each field of a group is blank. The adapters set it blank in the form too, with Formisch's `setInput`, as soon as it is cleared, so it is blank when it shows again. A field that starts hidden this way starts blank, without its `default`.
- **A field hidden otherwise keeps its value**: by `hide`, by a `show` that isn't met, or by a group, list, section or step that `hide` hides. It submits its output when its value is valid, and nothing when it isn't, so its errors, which nobody can see, never block the form.

So **plain hiding submits old values**. A product line that was a service line still submits its hours, and a hidden "Repeat the shipping ZIP" still submits what it held. Use `hideAndClear` for data that only makes sense while the field shows, and `hide` or `show` to keep what the user typed for when the field comes back. To clear a field a `show` hides, give it `hideAndClear` with the opposite condition.

Typing the form, mark every field that can hide as optional in the output type: a required field submits nothing while it is hidden.

## Groups, lists, sections and steps

- **A hidden group, list, section or step hides everything in it**, and clears it when `hideAndClear` hides it. A field inside is hidden even when its own `show` is met.
- **A group whose fields are all hidden hides too.** The fields that count are those with a value, nested groups and lists included, and the display elements with `affects` of their own: a heading without conditions doesn't keep a group on show, but a paragraph shown by a condition does. A list never hides this way: it has a value of its own, and its add button.
- **A section, a row or a step of the layout whose fields are all hidden hides**, by the same rule. A field hidden in a row drops out of it, and the row's other cells keep their spans: no field moves to another row. Next and Back skip a hidden step, and the adapters leave it out of `steps.list`, unless the user is on it.
- **A step or a section with `affects`** hides and clears the fields placed in it. Where the layout splits a group, only the fields of the group placed in the section go with it.

## Loops

A condition can't depend on itself. These are all `cycle` issues, which name the loop:

- `a` hides with `b`, and `b` with `a`;
- a field that reads itself;
- a group that reads a field inside it, like "show `company` when `company.name` is filled": it would have two answers;
- a step or a section that reads a field placed in it.

The fields of a list's items are checked once, by their `*` paths.

## Checks

`validate()` checks every `affects` along with the rest of the definition:

| Problem                                                                                                       | Code            |
| ------------------------------------------------------------------------------------------------------------- | --------------- |
| `affects` isn't a list, an affect isn't an object, an unknown `effect`, no `when`, an effect twice            | `invalid_shape` |
| A test with no operator, or with two; `all` or `any` with `field`; an empty `all`, `any` or `in`; a bad value | `invalid_shape` |
| `affects` on the `of` field of a list                                                                         | `invalid_shape` |
| A key no affect or condition takes, like a misspelled operator `equal`                                        | `unknown_key`   |
| A path to no field with a value: a typo, a display element, an index, an item's field from outside its item   | `unknown_field` |
| An operator the field's kind doesn't take, like `equals` on a file                                            | `kind_mismatch` |
| A value the field can't hold, or an empty one                                                                 | `invalid_value` |
| Conditions that depend on each other                                                                          | `cycle`         |

Each issue has its full path, such as `['fields', 3, 'affects', 0, 'when', 'all', 1, 'field']`. A field a condition reads that has issues of its own adds none.

## Rendering

The schema skips hidden fields and gives their output either way, so validation and submitting need nothing more. To render, `builder.getVisibility(json)` tells what to hide, in any framework:

```ts
const visibility = builder.getVisibility(json)
const state = visibility.of(getInput(form)) // the same object until what is hidden changes

state.isHidden(fieldNode, indexes) // a field of getFieldTree or getLayout
state.isStepHidden(step)
state.shownNodes(nodes, indexes) // the layout nodes to render
for (const { path, input } of state.toClear) setInput(form, { path, input }) // in an effect
```

The Vue and React adapters do all of this. [Formisch in each framework](https://github.com/whatsaaaa/form-builder/blob/main/packages/schema/docs/frameworks.md) has a renderer for Preact, Solid, Svelte, Qwik and Angular that does it too. Without the clearing effect, the output is still right, but a cleared field shows its old value when it comes back.

## JSON Schema

The package ships `definition.schema.json`, the JSON Schema of definitions for a builder with `affects()`: every key of the schema package's own, with `affects` on fields, steps and sections. Point a definition at it with `$schema`, and editors suggest effects and operators:

```json
{
  "$schema": "./node_modules/@whatsaaaa/form-builder-affects/definition.schema.json",
  "version": "1",
  "fields": []
}
```

It can't check paths, kinds, values or loops: `validate()` does. For a builder with your own registries too, make it with the schema package's `toJsonSchema(builder)`, which takes the extension's keys.

## TypeScript

`builder.defineForm()` types `affects` on fields, steps, sections and display elements, with the types `Affect`, `Condition`, `Effect` and `Scalar` this package exports.
