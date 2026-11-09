<script lang="ts">
  import type { FormStore } from '@formisch/svelte'
  import type { LayoutNode } from '@whatsaaaa/form-builder-schema'
  import type { Snippet } from 'svelte'
  import ArrayField from './ArrayField.svelte'
  import Layout from './Layout.svelte'
  import ValueField from './ValueField.svelte'

  let {
    form,
    nodes,
    indexes,
    slots,
  }: {
    form: FormStore
    nodes: readonly LayoutNode[]
    /** The index of each array item the nodes are in, outermost first. */
    indexes: readonly number[]
    /** The content of the layout's slots, by name. */
    slots: Record<string, Snippet>
  } = $props()
</script>

{#each nodes as node (node.key)}
  {#if node.type === 'section'}
    <fieldset>
      <legend>{node.section.label}</legend>
      <Layout {form} nodes={node.children} {indexes} {slots} />
    </fieldset>
  {:else if node.type === 'row'}
    <!-- One line of a 12-column grid, where each cell takes its span. -->
    <div style="display: grid; grid-template-columns: repeat(12, 1fr)">
      {#each node.children as cell (cell.key)}
        <div data-span={cell.span} style:grid-column="span {cell.span}">
          <Layout {form} nodes={[cell]} {indexes} {slots} />
        </div>
      {/each}
    </div>
  {:else if node.type === 'slot'}
    {@render slots[node.name]?.()}
  {:else if node.node.role === 'display'}
    {#if node.node.type === 'heading'}
      <svelte:element this={`h${Number(node.node.field.level ?? 2)}`}>
        {node.node.field.text}
      </svelte:element>
    {:else if node.node.type === 'paragraph'}
      <p>{node.node.field.text}</p>
    {:else}
      <hr />
    {/if}
  {:else if node.node.role === 'group'}
    <fieldset>
      <legend>{node.node.field.label ?? node.node.field.name}</legend>
      <Layout {form} nodes={node.children} {indexes} {slots} />
    </fieldset>
  {:else if node.node.role === 'array'}
    <ArrayField {form} {node} {indexes} />
  {:else}
    <ValueField {form} node={node.node} {indexes} />
  {/if}
{/each}
