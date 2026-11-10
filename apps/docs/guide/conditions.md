---
description: Show, hide and clear fields, sections and steps by the values of other fields, with the affects package.
---

# Conditions

The affects package adds conditions to definitions: a field, a section or a step shows, hides, or hides and clears its value, by the values of other fields. A hidden field isn't validated, in every Formisch package and in a plain `v.parse`. Below you will learn how to write conditions and what they do.

## Adding the extension

Conditions come from [`@whatsaaaa/form-builder-affects`](/api/affects/), an extension of the schema builder. Give the builder the extension:

<<< @/snippets/schema/conditions.ts#builder

Then write `affects` on the fields. Here, the VAT ID only shows, and is only required, for a business account:

```json
{
  "version": "1",
  "fields": [
    {
      "name": "accountType",
      "type": "radio",
      "required": true,
      "options": [
        { "value": "personal", "label": "Personal" },
        { "value": "business", "label": "Business" }
      ]
    },
    {
      "name": "vatId",
      "type": "text",
      "required": true,
      "affects": [
        {
          "effect": "hideAndClear",
          "when": { "field": "accountType", "notEquals": "business" }
        }
      ]
    }
  ]
}
```

<<< @/snippets/schema/conditions.ts#parse

Without the extension, `affects` is an unknown key: `validate()` reports it, and `build()` throws. A definition never runs without its conditions by mistake.

## Effects

`affects` is a list of effects, each with the condition that applies it:

| Effect         | While its condition is met                                |
| -------------- | --------------------------------------------------------- |
| `show`         | the field shows. Otherwise it is hidden, like with `hide` |
| `hide`         | the field is hidden, and keeps its value                  |
| `hideAndClear` | the field is hidden, and its value is cleared             |

- **Hide always wins.** A field is hidden when its `show` condition isn't met, or its `hide` or `hideAndClear` condition is. It is cleared only when its `hideAndClear` condition is met.
- **Each effect goes once on a field.** Join conditions with `all` or `any` instead. A field can have `show` together with `hide` or `hideAndClear`.
- **Effects go on** any field at any depth, display elements, groups and lists included, and on the layout's steps, sections and display elements. Not on a row, nor on the `of` field of a list, which is the item itself: put them on the list.

## Conditions

A condition tests one field, by its dot path, with exactly one operator. `all` and `any` join conditions, and nest to any depth:

```json
{
  "all": [
    { "field": "accountType", "equals": "business" },
    {
      "any": [
        { "field": "country", "in": ["DE", "AT"] },
        { "field": "vatId", "notEmpty": true }
      ]
    }
  ]
}
```

| Operator    | Value                       | True when the field                                       |
| ----------- | --------------------------- | --------------------------------------------------------- |
| `equals`    | a string, number or boolean | holds the value                                           |
| `notEquals` | a string, number or boolean | doesn't hold the value, or is empty                       |
| `in`        | a list of at least one      | holds one of the values                                   |
| `includes`  | a string, number or boolean | is a multiselect or a list of values, and holds the value |
| `empty`     | `true`                      | is empty                                                  |
| `notEmpty`  | `true`                      | isn't empty                                               |

Paths are those of [form rules](/guide/form-rules#paths): `accountType`, `billing.zip`, or `lines.*.kind` for the field of the same item of `lines`, from a field, a section or a display element inside its items. A path with an index, like `lines.0.kind`, or to an item's field from outside the items, is an issue.

## Operators by kind

Each operator fits some kinds of fields:

| Field                                        | `equals`, `notEquals`, `in` | `includes` | `empty`, `notEmpty` |
| -------------------------------------------- | --------------------------- | ---------- | ------------------- |
| text, number, checkbox, date, select, radio  | yes                         | no         | yes                 |
| a multiselect, or a list of values with `of` | no                          | yes        | yes                 |
| a list of objects with `fields`, a file      | no                          | no         | yes                 |
| a group, which is never empty                | no                          | no         | no                  |

## Values

A value must be one the field can hold: the field's schema, rules included, must take it, like a `default`. So `{ "field": "country", "equals": "Germny" }` on a select is an issue, not a condition that is never met. A date is the ISO string the field holds, like `"2026-11-09"`.

- **Conditions read the input**, what the form holds now. A number is a number, as renderers set it, but normalize rules like `trim` aren't applied.
- **Empty** is what `required` treats as empty: `undefined`, `""` or `[]`. An empty field never `equals` anything, and `notEquals` is true for it.
- **A checkbox nobody touched holds nothing**, not `false`. To show something while it isn't ticked, write `{ "notEquals": true }`, or give the checkbox `"default": false`.

## What a hidden field does

- **It isn't validated**: no `required`, no rules, and no form rule that reads it or is on it. Formisch shows no error on it.
- **It counts as empty in every other condition**, so conditions chain. When `company` hides, a field shown for `company.size` being `"large"` hides too, whatever `company.size` holds.
- **A field that `hideAndClear` hides is blank.** It submits nothing, a list submits `[]`, and each field of a group is blank. The adapters also set it blank in the form as soon as it is cleared, so it is blank when it shows again. A field that starts hidden this way starts without its `default`.
- **A field hidden otherwise keeps its value**: by `hide`, by a `show` that isn't met, or by a group, section or step that `hide` hides. It submits its output when its value is valid, and nothing when it isn't, so errors nobody can see never block the form.

So plain hiding submits old values. A product line that was a service line still submits its hours. Use `hideAndClear` for data that only makes sense while the field shows, and `hide` or `show` to keep what the user typed for when the field comes back. To clear a field that a `show` hides, give it `hideAndClear` with the opposite condition.

## Groups, lists, sections and steps

- **A hidden group, list, section or step hides everything in it**, and clears it when `hideAndClear` hides it. A field inside is hidden even when its own `show` is met.
- **A group whose fields are all hidden hides too.** The fields that count are those with a value, and display elements with `affects` of their own. A list never hides this way: it has a value of its own, and its add button.
- **A section, a row or a step whose fields are all hidden hides** by the same rule. A field hidden in a row drops out of it, and the other cells keep their spans. Next and Back skip a hidden step.
- **A step or a section with `affects`** hides and clears the fields placed in it. Where the layout splits a group, only the fields of the group placed in the section go with it.

## Loops

A condition can't depend on itself. Each of these is a `cycle` issue that names the loop:

- `a` hides with `b`, and `b` with `a`.
- A field reads itself.
- A group reads a field inside it, like "show `company` when `company.name` is filled".
- A step or a section reads a field placed in it.

## Rendering

The schema skips hidden fields, so validating and submitting need nothing more. The Vue and React adapters also leave hidden fields, sections and steps out of the form, and clear what `hideAndClear` clears: pass `useJsonForm` the builder with the extension.

To render conditions yourself, `getVisibility()` tells what is hidden for any input:

<<< @/snippets/schema/conditions.ts#visibility

`state.shownNodes(nodes, indexes)` gives the layout nodes to render, and `state.isStepHidden(step)` the steps to skip. Every [Formisch binding](/frameworks/formisch) renderer uses it. Without the clearing, the output is still right, but a cleared field shows its old value when it comes back.

## Checks and types

`validate()` checks every `affects` with the rest of the definition: shapes, paths, operators against the kind of the field they read, values and loops. See [checking definitions](/guide/checking-definitions#conditions). The package ships a [JSON Schema](/guide/json-schema#using-the-shipped-schema) with `affects`, and `defineForm()` [types](/guide/typescript) it. While the package is before 1.0, the hosted schema follows its latest release.
