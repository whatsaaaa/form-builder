<script setup lang="ts">
import { computed, ref } from 'vue'
import { Form, getInput } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import { fieldComponents } from '../components/fields/field-components'
import { layoutComponents } from '../components/layout/layout-components'

// One definition, laid out by its JSON: the order on the left, the summary on the right. The app
// puts its own shipping line and submit button in the layout's slots.
const definition: JsonForm = {
  version: '1',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    {
      name: 'address',
      type: 'group',
      label: 'Address',
      fields: [
        { name: 'street', type: 'text', required: true },
        { name: 'city', type: 'text', required: true },
        { name: 'zip', type: 'text', label: 'ZIP code', rules: [{ rule: 'digits' }] },
      ],
    },
    {
      name: 'lines',
      type: 'array',
      label: 'Order lines',
      required: { message: 'Add at least one product' },
      fields: [
        { name: 'product', type: 'text', required: true },
        {
          name: 'quantity',
          type: 'number',
          default: 1,
          rules: [{ rule: 'minValue', value: 1, message: 'At least 1' }],
        },
      ],
    },
    {
      name: 'coupon',
      type: 'text',
      rules: [
        { rule: 'trim' },
        { rule: 'toUpperCase' },
        { rule: 'regex', pattern: '^[A-Z0-9]{6}$', message: 'Six letters or digits' },
      ],
    },
    { name: 'newsletter', type: 'checkbox', label: 'Send me the newsletter' },
    {
      name: 'acceptTerms',
      type: 'checkbox',
      label: 'I accept the terms',
      required: { message: 'Please accept the terms' },
    },
  ],
  layout: {
    items: [
      {
        type: 'row',
        items: [
          {
            type: 'section',
            id: 'delivery',
            label: 'Delivery',
            span: 8,
            items: [
              { type: 'row', items: ['name', 'email'] },
              {
                field: 'address',
                items: ['street', { type: 'row', items: [{ field: 'city', span: 8 }, 'zip'] }],
              },
              {
                field: 'lines',
                items: [{ type: 'row', items: [{ field: 'product', span: 9 }, 'quantity'] }],
              },
            ],
          },
          {
            type: 'section',
            id: 'summary',
            label: 'Summary',
            ui: { variant: 'card' },
            items: [{ type: 'slot', name: 'shipping' }, '*', { type: 'slot', name: 'submit' }],
          },
        ],
      },
    ],
  },
}

// The form's input, so Formisch's own functions check their paths and values against it.
interface CheckoutInput {
  name: string
  email: string
  address: { street: string; city: string; zip?: string }
  lines: { product: string; quantity: number }[]
  coupon?: string
  newsletter?: boolean
  acceptTerms: boolean
}

const jsonForm = useJsonForm<CheckoutInput>(definition, {
  components: fieldComponents,
  layoutComponents,
})

// Read with Formisch's getInput: a typo in a path fails the type check.
const shipping = computed(() => {
  const count = getInput(jsonForm.form, { path: ['lines'] })?.length ?? 0
  const city = getInput(jsonForm.form, { path: ['address', 'city'] })
  const lines = `${count} ${count === 1 ? 'line' : 'lines'}`
  return city ? `${lines}, shipping to ${city}` : lines
})
const submitted = ref<unknown>()
</script>

<template>
  <Form class="form" :of="jsonForm.form" @submit="(output) => (submitted = output)">
    <JsonFields :of="jsonForm">
      <template #shipping>
        <p class="shipping">{{ shipping }}</p>
      </template>
      <template #submit>
        <button type="submit">Place order</button>
      </template>
    </JsonFields>
  </Form>

  <h2>Submitted output</h2>
  <pre>{{ submitted === undefined ? 'Nothing submitted yet' : submitted }}</pre>
</template>

<style scoped>
h2 {
  margin-top: 2rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}

pre {
  padding: 0.75rem;
  border-radius: 6px;
  background: var(--color-background-mute);
  font-size: 0.85rem;
  overflow-x: auto;
}
</style>
