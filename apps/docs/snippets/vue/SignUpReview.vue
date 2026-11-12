<script setup lang="ts">
import { Form } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import { components } from './all-fields'
import LayoutRow from './LayoutRow.vue'
import ReviewList from './ReviewList.vue'

const { definition } = defineProps<{ definition: JsonForm }>()

const jsonForm = useJsonForm(definition, {
  components,
  layoutComponents: { row: LayoutRow },
})

function save(output: unknown) {
  console.log(output)
}
</script>

<template>
  <Form :of="jsonForm.form" @submit="save">
    <!-- #region review -->
    <JsonFields :of="jsonForm">
      <template #review>
        <ReviewList :of="jsonForm" />
      </template>
    </JsonFields>
    <!-- #endregion review -->
    <button
      v-if="!jsonForm.steps.isFirst"
      type="button"
      @click="jsonForm.steps.back()"
    >
      Back
    </button>
    <button type="submit">
      {{ jsonForm.steps.isLast ? 'Sign up' : 'Next' }}
    </button>
  </Form>
</template>
