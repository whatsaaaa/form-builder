<script lang="ts">
  import { type FormStore, insert, remove, useFieldArray } from '@formisch/svelte'
  import { type FieldNode, toFieldPath } from '@whatsaaaa/form-builder-schema'
  import { builder } from './builder'
  import Fields from './Fields.svelte'

  let { form, node, indexes }: { form: FormStore; node: FieldNode; indexes: readonly number[] } =
    $props()

  // Derived, so the path follows the item when one before it is removed. It comes from the
  // definition at runtime, so Formisch's types can't check it.
  const path = $derived(toFieldPath(node.dataPath, indexes))
  const array = useFieldArray(
    () => form,
    () => ({ path: path as never }),
  )
  const add = () =>
    insert(form, { path: path as never, initialInput: builder.getItemInput(node.field) as never })
</script>

<fieldset>
  <legend>{node.field.label ?? node.field.name}</legend>
  {#each array.items as item, index (item)}
    <div>
      <Fields {form} nodes={node.children} indexes={[...indexes, index]} />
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
