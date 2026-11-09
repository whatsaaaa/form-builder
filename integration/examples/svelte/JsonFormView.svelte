<script lang="ts">
  import { createForm, Form, type SubmitHandler } from '@formisch/svelte'
  import type { JsonForm, JsonFormSchema } from '@whatsaaaa/form-builder-schema'
  import { untrack } from 'svelte'
  import { builder } from './builder'
  import Fields from './Fields.svelte'

  let { json, onsubmit }: { json: JsonForm; onsubmit: SubmitHandler<JsonFormSchema> } = $props()

  // Formisch reads its config once, so read the definition once too.
  const { fields, ...config } = untrack(() => ({
    schema: builder.build(json),
    initialInput: builder.getInitialInput(json),
    fields: builder.getFieldTree(json),
  }))
  const form = createForm(config)
</script>

<Form of={form} onsubmit={(output) => onsubmit(output)}>
  <Fields {form} nodes={fields} indexes={[]} />
  <button type="submit">Save</button>
</Form>
