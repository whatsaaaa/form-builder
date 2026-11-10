---
description: What a definition's conditions hide, as getVisibility gives it, and the state for one input.
---

# Visibility

What a definition's conditions hide, as the builder's [`getVisibility()`](/api/schema/SchemaBuilder#getvisibility) gives it.

## Definition

- `Visibility`
  - `conditional` <code>boolean</code>: true when what is hidden depends on the input
  - `of` <code>(input: unknown) =&gt; [VisibilityState](/api/schema/Visibility#visibilitystate)</code>: the state for an input. The same object while what is hidden stays the same
  - `clear` <code>&lt;T&gt;(input: T) =&gt; T</code>: the input with the fields its conditions clear made blank

### Explanation

Set each field of `toClear` with Formisch's `setInput`, in an effect. The schema blanks their output either way. See [conditions](/guide/conditions#rendering).

## VisibilityState

- `VisibilityState`
  - `isHidden` `(node: FieldNode, indexes: readonly number[]) => boolean`: whether a field is hidden, by its own conditions or by something it is in
  - `isStepHidden` `(step: LayoutStep) => boolean`: whether a step is hidden, by its conditions or because its fields all are
  - `shownNodes` `(nodes: readonly LayoutNode[], indexes: readonly number[], isShown?) => LayoutNode[]`: the layout nodes to render, like [`shownNodes`](/api/schema/shownNodes)
  - `toClear` `readonly FieldToClear[]`: the cleared fields that still hold something

## FieldToClear

- `FieldToClear`
  - `path` `FieldPath`: its Formisch path
  - `input` `unknown`: `undefined`, or `[]` for a list

## Example

<<< @/snippets/schema/conditions.ts#visibility

## Related

### Packages

- [affects](/api/affects/affects)
