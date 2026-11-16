<script setup lang="ts">
import { Form } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import { ref } from 'vue'
// The builder with fills({ sources: { profiles } }).
import { builder } from '../schema/fills'
import { components } from './fields'

const { definition } = defineProps<{ definition: JsonForm }>()
const fillError = ref<string>()

const jsonForm = useJsonForm(definition, {
  builder,
  components,
  // The library shows no error: what the user sees is yours.
  onFillError: () => {
    fillError.value =
      "Couldn't load the profile. Fill in the fields yourself."
  },
})

function save(output: unknown) {
  // { profile: 'a', firstName: 'Marko', lastName: 'Petrović', address: { city: 'Beograd' } }
  console.log(output)
}
</script>

<template>
  <Form :of="jsonForm.form" @submit="save">
    <JsonFields :of="jsonForm" />
    <p v-if="fillError" role="alert">{{ fillError }}</p>
    <!-- A profile still on its way would submit the fields blank. -->
    <button type="submit" :disabled="jsonForm.fills.pending.length > 0">
      Save
    </button>
  </Form>
</template>
