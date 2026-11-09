<script lang="ts">
  import type { FormStore } from '@formisch/svelte'
  import type { LayoutNode, VisibilityState } from '@whatsaaaa/form-builder-schema'
  import type { Snippet } from 'svelte'
  import ArrayField from './ArrayField.svelte'
  import Layout from './Layout.svelte'
  import ValueField from './ValueField.svelte'

  let {
    form,
    visibility,
    nodes,
    indexes,
    slots,
  }: {
    form: FormStore
    /** What the conditions hide now: the nodes it hides are left out. */
    visibility: VisibilityState
    nodes: readonly LayoutNode[]
    /** The index of each array item the nodes are in, outermost first. */
    indexes: readonly number[]
    /** The content of the layout's slots, by name. */
    slots: Record<string, Snippet>
  } = $props()

  const shown = $derived(visibility.shownNodes(nodes, indexes))
</script>

{#each shown as node (node.key)}
  {#if node.type === 'section'}
    <fieldset>
      <legend>{node.section.label}</legend>
      <Layout {form} {visibility} nodes={node.children} {indexes} {slots} />
    </fieldset>
  {:else if node.type === 'row'}
    <!-- One line of a 12-column grid, where each cell takes its span. -->
    <div style="display: grid; grid-template-columns: repeat(12, 1fr)">
      {#each node.children as cell (cell.key)}
        <div data-span={cell.span} style:grid-column="span {cell.span}">
          <Layout {form} {visibility} nodes={[cell]} {indexes} {slots} />
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
      <Layout {form} {visibility} nodes={node.children} {indexes} {slots} />
    </fieldset>
  {:else if node.node.role === 'array'}
    <ArrayField {form} {visibility} {node} {indexes} />
  {:else}
    <ValueField {form} node={node.node} {indexes} />
  {/if}
{/each}
