<script setup lang="ts">
import { Form } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import { components } from './all-fields'
import LayoutRow from './LayoutRow.vue'

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
    <ol>
      <li
        v-for="(step, index) in jsonForm.steps.list"
        :key="step.step.id ?? index"
        :aria-current="index === jsonForm.steps.index ? 'step' : undefined"
      >
        {{ step.step.label }}
      </li>
    </ol>
    <JsonFields :of="jsonForm" />
    <button
      v-if="!jsonForm.steps.isFirst"
      type="button"
      @click="jsonForm.steps.back()"
    >
      Back
    </button>
    <button
      v-if="!jsonForm.steps.isLast"
      type="button"
      @click="jsonForm.steps.next()"
    >
      Next
    </button>
    <button v-else type="submit">Sign up</button>
  </Form>
</template>
