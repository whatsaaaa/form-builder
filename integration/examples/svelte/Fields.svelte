<script lang="ts">
  import type { FormStore } from '@formisch/svelte'
  import type { FieldNode } from '@whatsaaaa/form-builder-schema'
  import ArrayField from './ArrayField.svelte'
  import Fields from './Fields.svelte'
  import ValueField from './ValueField.svelte'

  let {
    form,
    nodes,
    indexes,
  }: {
    form: FormStore
    nodes: readonly FieldNode[]
    /** The index of each array item the fields are in, outermost first. */
    indexes: readonly number[]
  } = $props()
</script>

{#each nodes as node, position (node.field.name ?? `#${position}`)}
  {#if node.role === 'display'}
    {#if node.type === 'heading'}
      <svelte:element this={`h${Number(node.field.level ?? 2)}`}>{node.field.text}</svelte:element>
    {:else if node.type === 'paragraph'}
      <p>{node.field.text}</p>
    {:else}
      <hr />
    {/if}
  {:else if node.role === 'group'}
    <fieldset>
      <legend>{node.field.label ?? node.field.name}</legend>
      <Fields {form} nodes={node.children} {indexes} />
    </fieldset>
  {:else if node.role === 'array'}
    <ArrayField {form} {node} {indexes} />
  {:else}
    <ValueField {form} {node} {indexes} />
  {/if}
{/each}
