<script setup lang="ts">
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import FormExample from '../components/FormExample.vue'

const definition: JsonForm = {
  version: '1',
  fields: [
    {
      name: 'username',
      type: 'text',
      required: true,
      rules: [
        { rule: 'trim' },
        { rule: 'toLowerCase' },
        { rule: 'minGraphemes', value: 3, message: 'At least 3 characters' },
        { rule: 'maxBytes', value: 32, message: 'Too long' },
        { rule: 'slug', message: 'Letters, digits and dashes only' },
      ],
    },
    {
      name: 'website',
      type: 'text',
      rules: [{ rule: 'trim' }, { rule: 'url', message: 'Start with https://' }],
    },
    {
      name: 'inviteCode',
      type: 'text',
      required: { message: 'You need an invite' },
      rules: [
        { rule: 'toUpperCase' },
        { rule: 'regex', pattern: '^[A-Z]{3}-\\d{4}$', message: 'Looks like ABC-1234' },
      ],
    },
    {
      name: 'favouriteColour',
      type: 'text',
      rules: [{ rule: 'hexColor', message: 'A hex colour, like #3366ff' }],
    },
    {
      name: 'age',
      type: 'number',
      rules: [
        { rule: 'integer', message: 'Whole years' },
        { rule: 'minValue', value: 16, message: 'You must be 16 or older' },
        { rule: 'toMaxValue', value: 120 },
      ],
    },
  ],
}
</script>

<template>
  <FormExample :definition="definition" />
</template>
