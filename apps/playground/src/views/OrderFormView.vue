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
    { name: 'deliverFrom', type: 'date', label: 'Deliver from' },
    { name: 'deliverBy', type: 'date', label: 'Deliver by' },
    {
      name: 'lines',
      type: 'array',
      label: 'Order lines',
      rules: [{ rule: 'minLength', value: 1, message: 'Add at least one line' }],
      fields: [
        { name: 'product', type: 'text', required: true },
        { name: 'quantity', type: 'number', required: true, rules: [{ rule: 'integer' }] },
        { name: 'giftWrapped', type: 'number', label: 'How many gift-wrapped' },
      ],
    },
  ],
  formRules: [
    {
      rule: 'compare',
      field: 'deliverBy',
      op: 'gte',
      other: 'deliverFrom',
      message: "Can't be before the first day",
    },
    {
      rule: 'compare',
      field: 'lines.*.giftWrapped',
      op: 'lte',
      other: 'lines.*.quantity',
      message: "Can't wrap more than you order",
    },
  ],
}
</script>

<template>
  <FormExample :definition="definition" />
</template>
