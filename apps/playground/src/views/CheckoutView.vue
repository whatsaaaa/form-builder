<script setup lang="ts">
import { computed, ref } from 'vue'
import { Form, getInput } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonField, JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import { fieldComponents } from '../components/fields/field-components'

// One definition, laid out by hand: the order on the left, the summary fields on the right.
const definition: JsonForm = {
  version: '1',
  fields: [
    { type: 'heading', text: 'Delivery' },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    {
      name: 'address',
      type: 'group',
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

// The summary fields are placed by hand, so the main column leaves them out.
const summary = ['coupon', 'newsletter', 'acceptTerms']

const jsonForm = useJsonForm<CheckoutInput>(definition, { components: fieldComponents })

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
  <Form class="form checkout" :of="jsonForm.form" @submit="(output) => (submitted = output)">
    <div class="order">
      <JsonFields :of="jsonForm" :except="summary" />
    </div>

    <aside class="summary">
      <h2>Summary</h2>
      <p class="shipping">{{ shipping }}</p>
      <JsonField :of="jsonForm" path="coupon" />
      <JsonField :of="jsonForm" path="newsletter" />
      <JsonField :of="jsonForm" path="acceptTerms" />
      <button type="submit">Place order</button>
    </aside>
  </Form>

  <h2>Submitted output</h2>
  <pre>{{ submitted === undefined ? 'Nothing submitted yet' : submitted }}</pre>
</template>

<style scoped>
.checkout {
  display: grid;
  gap: 2rem;
  align-items: start;
}

@media (min-width: 768px) {
  .checkout {
    grid-template-columns: 2fr 1fr;
  }
}

.order,
.summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background-soft);
}

h2 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}

h2:not(:first-child) {
  margin-top: 1.5rem;
}

pre {
  padding: 0.75rem;
  border-radius: 6px;
  background: var(--color-background-mute);
  font-size: 0.85rem;
  overflow-x: auto;
}
</style>
