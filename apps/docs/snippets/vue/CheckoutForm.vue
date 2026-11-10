<script setup lang="ts">
import { Form } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import { components } from './all-fields'
import LayoutRow from './LayoutRow.vue'
import LayoutSection from './LayoutSection.vue'

const { definition } = defineProps<{ definition: JsonForm }>()

const jsonForm = useJsonForm(definition, {
  components,
  layoutComponents: { section: LayoutSection, row: LayoutRow },
})

function save(output: unknown) {
  console.log(output)
}
</script>

<template>
  <Form :of="jsonForm.form" @submit="save">
    <JsonFields :of="jsonForm">
      <template #submit>
        <button type="submit">Place order</button>
      </template>
    </JsonFields>
  </Form>
</template>
