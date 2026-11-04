<script setup lang="ts">
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import FormExample from '../components/FormExample.vue'

// defineForm checks types, rules and their params as you type, and returns the definition
// unchanged. Try a typo, such as rule: 'minLenght'.
const { defineForm } = createSchemaBuilder()

const definition = defineForm({
  version: "1",
  fields: [
    {
      name: 'email',
      type: 'email',
      label: 'Email address',
      required: { message: 'Email is required' },
      rules: [{ rule: 'trim' }, { rule: 'email', message: "That doesn't look like an email" }],
    },
    {
      name: 'password',
      type: 'password',
      required: true,
      rules: [{ rule: 'minLength', value: 10, message: 'At least 10 characters' }],
    },
  ],
})
</script>

<template>
  <FormExample :definition="definition" />
</template>
