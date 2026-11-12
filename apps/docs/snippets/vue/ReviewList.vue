<script setup lang="ts">
import { getInput } from '@formisch/vue'
import type { AnyJsonFormInstance } from '@whatsaaaa/form-builder-vue'
import { computed } from 'vue'
import { reviewOf } from './review'

const props = defineProps<{ of: AnyJsonFormInstance }>()

// The steps before the one on show, each with its answers.
const steps = computed(() => {
  const { form, steps, visibility } = props.of
  const input = getInput(form)
  return steps.list.slice(0, steps.index).map((step) => ({
    step: step.step,
    rows: reviewOf(step, input, visibility),
  }))
})
</script>

<template>
  <section v-for="({ step, rows }, index) in steps" :key="step.id ?? index">
    <h3>{{ step.label }}</h3>
    <dl>
      <div v-for="row in rows" :key="row.key">
        <dt>{{ row.label }}</dt>
        <dd>{{ row.value }}</dd>
      </div>
    </dl>
    <!-- Going back is free: it never validates. -->
    <button type="button" @click="of.steps.goTo(index)">Change</button>
  </section>
</template>
