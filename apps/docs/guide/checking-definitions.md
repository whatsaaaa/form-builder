---
description: Find every problem in a definition with validate(), and what each issue code means.
---

# Checking definitions

A definition that comes from outside your code, like one from a database or a visual editor, can have mistakes. Below you will learn how to find them before you build the form, and what each issue means.

## Validate

`validate()` never throws. It returns every problem in the definition, in document order, each with a `code`, a `path` into the definition and a `message`:

<<< @/snippets/schema/checking-definitions.ts#validate

`formatPath()` turns a path like `['fields', 1, 'rules', 0, 'rule']` into `fields[1].rules[0].rule`. An issue in a nested field has its full path, so an editor can point at the exact key.

## Build

`build()` runs the same checks and throws one [`DefinitionError`](/api/schema/DefinitionError) with every issue. So do `getLayout()`, `getFieldTree()` and `getVisibility()`, and the adapters' `useJsonForm`, which calls them:

<<< @/snippets/schema/checking-definitions.ts#build

Run `validate()` when you save a definition, and again before you render one you didn't write.

## Issue codes

| Code                  | What it means                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `invalid_shape`       | a value of the wrong type, like a string where a list goes                                                |
| `unsupported_version` | a `version` other than `"1"`                                                                              |
| `unknown_key`         | a key that the definition, the field's type or the layout node doesn't take                               |
| `unknown_type`        | a field type the builder doesn't know, or a layout node type kept for a later version                     |
| `missing_name`        | a field with a value but no `name`                                                                        |
| `invalid_name`        | a name with `.`, `[`, `]`, or the name `*` or `__proto__`                                                 |
| `duplicate_name`      | two fields with the same name next to each other                                                          |
| `invalid_props`       | a prop that the type's props schema rejects, like an empty `options` list                                 |
| `invalid_default`     | a `default` that the field's own schema rejects, rules included                                           |
| `unknown_rule`        | a rule or form rule the builder doesn't know                                                              |
| `unknown_param`       | a param that the rule doesn't take                                                                        |
| `invalid_params`      | a param of the wrong type, or a `regex` pattern that JavaScript rejects                                   |
| `kind_mismatch`       | a rule that doesn't fit the field's kind, or form rule fields of different kinds                          |
| `unknown_field`       | a path that names no field with a value                                                                   |
| `duplicate_placement` | a field placed twice in the layout                                                                        |
| `unplaced_field`      | a field placed nowhere in the layout                                                                      |
| `duplicate_id`        | two layout nodes with the same `id`                                                                       |
| `invalid_span`        | a layout `span` that is no whole number from 1 to 12, or outside a row, or spans that don't fit their row |
| `invalid_value`       | a value in a condition that the field can't hold                                                          |
| `cycle`               | conditions that depend on each other                                                                      |

### Codes are API, messages are not

An issue's `code` and `path` are part of the public API, so you can rely on them, for example to point an editor at the key or to translate the issue. Its `message` is not: it can change in any release, and part of it comes from Valibot.

- A minor version can add a code for a new kind of mistake. Handle codes you don't know, for example by showing the message.
- Only a major version renames a code, or moves a mistake from one code to another.

## Fields

- **Keys** on a field must be one of the keys every field takes, or a prop of its type. Put your renderer's settings under `ui`, which is never checked. The [reserved keys](/api/schema/reserved-keys) kept for later versions, like `hidden`, are `unknown_key` for now.
- **Defaults** must pass the field's own schema, rules included. An empty default, like `""`, counts as none.
- **Names** are one key of the value, so they can't hold the characters paths use.

## Form rules

Form rules report on `['formRules', 0]` and below. A `field` that names no field with a value is `unknown_field` on `['formRules', 0, 'field']`. When a field the rule reads has issues of its own, the rule adds none, so one mistake reports once.

## Layout

The layout reports on `['layout']` and below, like `['layout', 'steps', 1, 'items', 0]`, once the fields have no issues of their own:

- A path that names no field with a value, or reaches into the items of a list, is `unknown_field`.
- A field placed twice is `duplicate_placement` on the second place, and one placed nowhere is `unplaced_field` on the list that misses it.
- A span that is no whole number from 1 to 12, a `span` outside a row, and the spans of a row over 12 columns or that can't be shared evenly are `invalid_span`.
- A field type with a value written in the layout is `invalid_shape`. A layout node type kept for a later version, like `tabs` or `group`, is `unknown_type`, even when a field type with a value has that name.

## Conditions

With the [affects package](/guide/conditions), `validate()` checks every `affects` too, after the layout:

| Problem                                                                                                     | Code            |
| ----------------------------------------------------------------------------------------------------------- | --------------- |
| `affects` isn't a list, an unknown `effect`, no `when`, an effect twice on one field                        | `invalid_shape` |
| A test with no operator or with two, `all` or `any` with `field`, an empty `all`, `any` or `in`             | `invalid_shape` |
| `affects` on the `of` field of a list                                                                       | `invalid_shape` |
| A key no affect or condition takes, like a misspelled operator `equal`                                      | `unknown_key`   |
| A path to no field with a value: a typo, a display element, an index, an item's field from outside its item | `unknown_field` |
| An operator the field's kind doesn't take, like `equals` on a file                                          | `kind_mismatch` |
| A value the field can't hold, or an empty one                                                               | `invalid_value` |
| Conditions that depend on each other                                                                        | `cycle`         |

Each issue has its full path, like `['fields', 3, 'affects', 0, 'when', 'all', 1, 'field']`.

## Mistakes in code

Mistakes in your own code throw a `TypeError` instead, as soon as they can: an unknown kind in a field type of yours, a reserved key in a rule's params, a missing component in a renderer. A `DefinitionError` always means the definition, and a `TypeError` your code.
