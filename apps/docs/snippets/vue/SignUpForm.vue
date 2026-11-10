<script setup lang="ts">
import { Form } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import { components } from './fields'

const { definition } = defineProps<{ definition: JsonForm }>()

const jsonForm = useJsonForm(definition, { components })

function save(output: unknown) {
  // { email: 'jane@example.com', password: 'correct horse', newsletter: true }
  console.log(output)
}
</script>

<template>
  <Form :of="jsonForm.form" @submit="save">
    <JsonFields :of="jsonForm" />
    <button type="submit">Sign up</button>
  </Form>
</template>
