<script setup lang="ts">
import { Form } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import { useTemplateRef, watch } from 'vue'
import { components } from './all-fields'
import LayoutRow from './LayoutRow.vue'

const { definition } = defineProps<{ definition: JsonForm }>()

const jsonForm = useJsonForm(definition, {
  components,
  layoutComponents: { row: LayoutRow },
})

// A new step moves the focus to its heading, so keyboard and screen
// reader users notice it. `post` runs once the step has rendered, and
// before the adapter focuses a field with an error.
const heading = useTemplateRef('heading')
watch(
  () => jsonForm.steps.current,
  () => heading.value?.focus(),
  { flush: 'post' },
)

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
    <h2 ref="heading" tabindex="-1">
      {{ jsonForm.steps.current.step.label }}
    </h2>
    <JsonFields :of="jsonForm" />
    <button
      v-if="!jsonForm.steps.isFirst"
      type="button"
      @click="jsonForm.steps.back()"
    >
      Back
    </button>
    <!-- A submit before the last step is a Next: Enter moves on. -->
    <button type="submit">
      {{ jsonForm.steps.isLast ? 'Sign up' : 'Next' }}
    </button>
  </Form>
</template>
