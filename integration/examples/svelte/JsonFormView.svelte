<script lang="ts">
  import {
    createForm,
    focus,
    Form,
    getInput,
    setErrors,
    setInput,
    type SubmitHandler,
    validate,
  } from '@formisch/svelte'
  import {
    fieldPathsOfStep,
    issuesOfStep,
    type JsonForm,
    type BuiltSchema,
    type LayoutStep,
  } from '@whatsaaaa/form-builder-schema'
  import { type Snippet, untrack } from 'svelte'
  import { builder } from './builder'
  import Layout from './Layout.svelte'

  let {
    json,
    onsubmit,
    slots = {},
  }: {
    json: JsonForm
    onsubmit: SubmitHandler<BuiltSchema>
    /** The content of the layout's slots, by name. */
    slots?: Record<string, Snippet>
  } = $props()

  // Formisch reads its config once, so read the definition once too.
  const { steps, conditions, ...config } = untrack(() => ({
    schema: builder.build(json),
    initialInput: builder.getInitialInput(json),
    steps: builder.getLayout(json).steps,
    conditions: builder.getVisibility(json),
  }))
  const form = createForm(config)
  // What the conditions hide for the input now: the same object until that changes.
  const visibility = $derived(conditions.of(getInput(form)))
  // The fields the conditions clear, set blank as soon as they are cleared.
  $effect(() => {
    const { toClear } = visibility
    untrack(() => {
      for (const { path, input } of toClear) setInput(form, { path, input } as never)
    })
  })
  let index = $state(0)
  const step = $derived(steps[index] as LayoutStep)
  // A step whose fields are all hidden is skipped. The current one stays, while the user is on it.
  const shown = $derived(
    steps.flatMap((each, i) => (i === index || !visibility.isStepHidden(each) ? [i] : [])),
  )
  const before = $derived(shown[shown.indexOf(index) - 1])
  const after = $derived(shown[shown.indexOf(index) + 1])

  // Next validates the whole form, and only the issues on this step's fields keep the user here.
  async function next() {
    const found = issuesOfStep(step, (await validate(form)).issues)
    if (found.length) {
      const first = found.find((issue) => issue.field.role === 'value')
      if (first) focus(form, { path: first.path as never })
      return
    }
    if (after === undefined) return
    // That validation set errors on the next step's fields too, which nobody saw.
    for (const path of fieldPathsOfStep(steps[after] as LayoutStep, getInput(form))) {
      setErrors(form, { path, errors: null } as never)
    }
    index = after
  }
</script>

<Form of={form} onsubmit={(output) => onsubmit(output)}>
  <!-- Keyed by the step, so its fields render anew when it changes. -->
  {#key index}
    <Layout {form} {visibility} nodes={step.children} indexes={[]} {slots} />
  {/key}
  {#if before !== undefined}
    <button type="button" data-back="" onclick={() => (index = before as number)}>Back</button>
  {/if}
  {#if after !== undefined}
    <button type="button" data-next="" onclick={next}>Next</button>
  {:else}
    <button type="submit">Save</button>
  {/if}
</Form>
