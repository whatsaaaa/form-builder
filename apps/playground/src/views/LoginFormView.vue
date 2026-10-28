<script setup lang="ts">
import type { JsonFormSchema } from '@whatsaaaa/form-builder-schema'
import FormExample from '../components/FormExample.vue'

const definition: JsonFormSchema = {
  version: '1',
  fields: [
    {
      name: 'email',
      type: 'email',
      required: { message: 'Email is required' },
      rules: [{ rule: 'email', message: "That doesn't look like an email" }],
    },
    {
      name: 'password',
      type: 'password',
      required: true,
      rules: [{ rule: 'minLength', value: 10, message: 'At least 10 characters' }],
    },
  ],
}
</script>

<template>
  <FormExample :definition="definition" />
</template>
