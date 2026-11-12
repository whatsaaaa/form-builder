<script setup lang="ts">
import { Form } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import { components } from './fields'

interface Customer {
  name: string
  email: string
  newsletter: boolean
}

const props = defineProps<{ definition: JsonForm; customer: Customer }>()
const emit = defineEmits<{ save: [customer: Customer] }>()

const jsonForm = useJsonForm<Customer>(props.definition, {
  components,
  // The form starts with the customer's values.
  initialInput: props.customer,
})
</script>

<template>
  <Form :of="jsonForm.form" @submit="(output) => emit('save', output)">
    <JsonFields :of="jsonForm" />
    <button type="submit">Save</button>
  </Form>
</template>
