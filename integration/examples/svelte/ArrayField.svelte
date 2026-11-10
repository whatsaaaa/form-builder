<script lang="ts">
  import { type FormStore, insert, remove, useFieldArray } from '@formisch/svelte'
  import {
    type LayoutField,
    toFieldPath,
    type VisibilityState,
  } from '@whatsaaaa/form-builder-schema'
  import { builder } from './builder'
  import Layout from './Layout.svelte'

  // A list: Formisch's field array, and the layout of each item. A slot never is in one.
  let {
    form,
    visibility,
    node,
    indexes,
  }: {
    form: FormStore
    visibility: VisibilityState
    node: LayoutField
    indexes: readonly number[]
  } = $props()

  // Derived, so the path follows the item when one before it is removed. It comes from the
  // definition at runtime, so Formisch's types can't check it.
  const path = $derived(toFieldPath(node.node.dataPath, indexes))
  const array = useFieldArray(
    () => form,
    () => ({ path: path as never }),
  )
  const add = () =>
    insert(form, {
      path: path as never,
      initialInput: builder.getItemInput(node.node.field) as never,
    })
</script>

<fieldset>
  <legend>{node.node.field.label ?? node.node.field.name}</legend>
  {#each array.items as item, index (item)}
    <div>
      <!-- Each item hides its own fields, by the fields of the item. -->
      <Layout {form} {visibility} nodes={node.children} indexes={[...indexes, index]} slots={{}} />
      <button
        type="button"
        data-remove={`${path.join('.')}.${index}`}
        onclick={() => remove(form, { path: path as never, at: index })}
      >
        Remove
      </button>
    </div>
  {/each}
  <button type="button" data-add={path.join('.')} onclick={add}>Add</button>
  {#if array.errors}
    <small data-error={path.join('.')}>{array.errors[0]}</small>
  {/if}
</fieldset>
