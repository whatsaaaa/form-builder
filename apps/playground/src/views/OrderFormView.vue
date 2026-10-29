<script setup lang="ts">
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import FormExample from '../components/FormExample.vue'

const definition: JsonForm = {
  version: '1',
  fields: [
    {
      name: 'quantity',
      type: 'number',
      required: { message: 'How many do you need?' },
      rules: [
        { rule: 'integer', message: 'Whole numbers only' },
        { rule: 'minValue', value: 1, message: 'At least 1' },
        { rule: 'maxValue', value: 10, message: 'At most 10 per order' },
      ],
    },
    {
      name: 'discountPercent',
      type: 'number',
      rules: [
        { rule: 'minValue', value: 0, message: 'Cannot be negative' },
        { rule: 'maxValue', value: 100, message: 'Cannot exceed 100' },
      ],
    },
  ],
}
</script>

<template>
  <FormExample :definition="definition" />
</template>
