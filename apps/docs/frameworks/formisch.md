---
description: How to render form definitions with Formisch's own package in any framework, with the helpers of the schema package.
---

# Rendering with Formisch

The schema package works with Formisch's own package for every framework, with no adapter. It gives a renderer everything it needs: the schema and initial input for Formisch, the layout with every reference resolved, and helpers for paths, values and steps. Below you will learn how a renderer uses them, with React as the example. The [Preact](/frameworks/preact), [Solid](/frameworks/solid), [Svelte](/frameworks/svelte), [Qwik](/frameworks/qwik) and [Angular](/frameworks/angular) pages have a whole tested renderer each, with the same shape.

## Creating the form

One builder gives Formisch the schema and the initial input, and you the layout to render:

<<< @/snippets/react/json-form-view.tsx#setup

- Use the same builder for all of it, so your own types and rules count everywhere.
- `getLayout()` throws a `DefinitionError` like `build()`, so run `validate()` first when the definition comes from outside your code.
- A definition without a `layout` has one step with every field, in order, so one renderer renders every definition.

## The layout tree

`getLayout()` gives `{ steps, ui }`, with at least one step. Each step has `children`, a tree of layout nodes, and every `"*"` is replaced by the fields it places:

| Node      | What it has                                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `field`   | `node`, the field's [`FieldNode`](/api/schema/FieldNode), and `children`: the layout of a group's fields, or of one item of a list |
| `section` | `section`, as written, with its `id`, `label`, `description` and `ui`, and `children`                                              |
| `row`     | `row`, as written, with its `id` and `ui`, and `children`, its cells                                                               |
| `slot`    | `name`                                                                                                                             |

- **Every node has a `span`**, the columns it takes in its row, and 12 outside one. Render a row as a grid of 12 columns, and each cell with `grid-column: span N`.
- **Every node has a `key`**, unique among its siblings and stable, for frameworks that key what they render.
- **Render a field's layout `children`**, never its `node.children`: the layout can reorder a group's fields and put text among them.

<<< @/snippets/react/json-form-view.tsx#layout

## Rendering by role

A field node has a `role`. Render each field by its role, so your own types render too:

| Role      | Which fields                 | Render                                                        |
| --------- | ---------------------------- | ------------------------------------------------------------- |
| `value`   | every field with a value     | a control, connected to Formisch's field at the node's path   |
| `group`   | a container of kind `object` | its layout children, like in a `<fieldset>`                   |
| `array`   | a container of kind `array`  | Formisch's field array, and its layout children for each item |
| `display` | a display element            | `field.text`. It has no Formisch field                        |

A `FieldNode` has `field`, the field as the definition has it, and its `type`, `role`, `kind`, `itemKind`, `dataPath`, `definitionPath` and `children`.

## Paths

A node's `dataPath` has `'*'` for each list index: `['lines', '*', 'quantity']`. `toFieldPath(node.dataPath, indexes)` puts in the index of each item the field is in, outermost first, and gives the path Formisch takes: `['lines', 0, 'quantity']`. Pass the indexes down as you render the items of a list.

The path comes from the definition at runtime, so Formisch's types can't check it: pass it `as never`.

## Lists

A list renders Formisch's field array, and the layout of each item:

<<< @/snippets/react/json-form-view.tsx#array

- `builder.getItemInput(field)` is the input of a new item, with the defaults its fields have in the definition.
- Key each item by its id from Formisch's `items`, so it keeps its inputs when another one is removed. `remove`, `move` and `swap` work as in any Formisch form.
- Show the list's own errors, like a required list's message, from its field array.

## Value fields

A value field connects to Formisch's field at its path, and sets what the element gives through `coerceInput()`:

<<< @/snippets/react/json-form-view.tsx#value

`coerceInput(input, node)` turns what an element gives into the value of the field's kind: `'5'` into `5` and `''` into `undefined` for a number, and a `FileList` into a file, or a list of files. Anything else is passed as it is, and the schema reports it.

Spread Formisch's element props for the field's name, focus and blur, and set the value yourself: with the field store's setter, or with `setInput(form, { path, input })`, which every Formisch package has.

## Controls

Every built-in type has a native control. Pick it by the field's `type`, and by `ui.widget` if your definitions use it:

| Type                                                                | Control                                                                    |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `text`, `email`, `password`, `url`, `tel`, `number`, `date`, `time` | `<input>` with the same `type`                                             |
| `datetime`                                                          | `<input type="datetime-local">`                                            |
| `textarea`                                                          | `<textarea>`                                                               |
| `checkbox`                                                          | `<input type="checkbox">`, setting its `checked`                           |
| `select`, `radio`                                                   | `<select>` or radios, from `field.options`                                 |
| `multiselect`                                                       | `<select multiple>`, or checkboxes with `"ui": { "widget": "checkboxes" }` |
| `file`                                                              | `<input type="file">`, with `multiple` when its kind is `array`            |

For choices, set the option's own value, not the element's string, so `2` stays a number. [Field components](/frameworks/field-components#choices) shows how.

- `isRequired(node.field)` is true when the definition makes a field required, like for an asterisk. The schema checks it: Formisch's `<Form>` turns the browser's own checks off.
- Form rules need no wiring. Their issues have the path of the field they name, so Formisch shows them on that field.
- When you look up a component by `node.type`, `checkComponents(nodes, components)` throws a `TypeError` that names every type without one, so check before you render. `checkLayoutComponents(layout, components, slots)` does the same for layout types and slots.

## Steps

A form with steps is one Formisch form with one schema, so Next validates the whole form and lets only the issues on the current step's fields keep the user there:

<<< @/snippets/react/json-form-view.tsx#next

1. `issuesOfStep(step, issues)` gives the issues on the step's fields, in layout order, each with its `field` and Formisch `path`. With any, it stays, and focuses the first field that has an element: a group or a list has none.
2. That validation also set errors on the next step's fields. `fieldPathsOf(step, getInput(form))` gives the path of each field of a step, with every list item there is, to clear them with `setErrors`.
3. Back never validates. Submit is the last step's, and Formisch validates the whole form again.

The Vue and React adapters do more, like restoring a step's errors when the user comes back: see [multi-step forms](/frameworks/multi-step-forms).

## Conditions

For the [conditions](/guide/conditions) of the affects package, read what is hidden from `builder.getVisibility(json)`, for the form's input:

- `visibility.of(getInput(form))` gives the state for the input now. It is the same object until what is hidden changes, so a renderer updates only then.
- `state.shownNodes(nodes, indexes)` gives the nodes to render: without hidden fields and sections, and without the groups, sections and rows whose fields are all hidden. Call it for each list item, with its indexes.
- `state.isStepHidden(step)` tells which steps Next and Back skip.
- `state.toClear` lists the fields to set blank: set each with Formisch's `setInput`, in an effect.

A builder without the extension, or a definition without conditions, hides nothing, so the same renderer renders every definition.

## Placing fields

To render a field away from the rest, in code rather than in the layout, find it in `builder.getFieldTree(json)` by its dot path, and leave it out where you render the rest:

- `findField(fields, 'coupon', { placed: true })` gives the field at a dot path, and throws a `TypeError` for a path that names no field, or a field of a list's items with `placed`.
- `selectFields(fields, { only, except })` gives the tree with just the fields `only` names, without the fields `except` names.
- `shownNodes(nodes, indexes, isShown)` leaves fields out of the layout, and the sections and rows left without fields.
- `dotPathOf(node)` gives a node's dot path, and `allFields(fields)` every node of the tree.

## Framework differences

| Framework | Package             | What changes                                                                                               |
| --------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Preact    | `@formisch/preact`  | A field's state is a signal: `field.input.value`, `field.errors.value`                                     |
| Solid     | `@formisch/solid`   | `createForm`, and the path as a getter                                                                     |
| Svelte    | `@formisch/svelte`  | `createForm`, and the form and the path as getters                                                         |
| Qwik      | `@formisch/qwik`    | `useForm$`, which builds the schema again wherever the form resumes                                        |
| Angular   | `@formisch/angular` | `injectForm` in `ngOnInit`, and `[formischControl]` where the element holds the value                      |
| Vue       | `@formisch/vue`     | Components set up once: pass the path to `useField` as a getter. Or use the [Vue adapter](/frameworks/vue) |

## The whole renderer

::: details The React renderer, in one file
<<< @/snippets/react/json-form-view.tsx#renderer
:::
