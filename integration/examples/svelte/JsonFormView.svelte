<script lang="ts">
  import {
    createForm,
    focus,
    Form,
    getInput,
    setErrors,
    type SubmitHandler,
    validate,
  } from '@formisch/svelte'
  import {
    fieldPathsOf,
    issuesOfStep,
    type JsonForm,
    type JsonFormSchema,
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
    onsubmit: SubmitHandler<JsonFormSchema>
    /** The content of the layout's slots, by name. */
    slots?: Record<string, Snippet>
  } = $props()

  // Formisch reads its config once, so read the definition once too.
  const { steps, ...config } = untrack(() => ({
    schema: builder.build(json),
    initialInput: builder.getInitialInput(json),
    steps: builder.getLayout(json).steps,
  }))
  const form = createForm(config)
  let index = $state(0)
  const step = $derived(steps[index] as LayoutStep)

  // Next validates the whole form, and only the issues on this step's fields keep the user here.
  async function next() {
    const found = issuesOfStep(step, (await validate(form)).issues)
    if (found.length) {
      const first = found.find((issue) => issue.field.role === 'value')
      if (first) focus(form, { path: first.path as never })
      return
    }
    // That validation set errors on the next step's fields too, which nobody saw.
    for (const path of fieldPathsOf(steps[index + 1] as LayoutStep, getInput(form))) {
      setErrors(form, { path, errors: null } as never)
    }
    index += 1
  }
</script>

<Form of={form} onsubmit={(output) => onsubmit(output)}>
  <!-- Keyed by the step, so its fields render anew when it changes. -->
  {#key index}
    <Layout {form} nodes={step.children} indexes={[]} {slots} />
  {/key}
  {#if index > 0}
    <button type="button" data-back="" onclick={() => (index -= 1)}>Back</button>
  {/if}
  {#if index < steps.length - 1}
    <button type="button" data-next="" onclick={next}>Next</button>
  {:else}
    <button type="submit">Save</button>
  {/if}
</Form>
