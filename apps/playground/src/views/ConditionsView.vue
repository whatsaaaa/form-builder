<script setup lang="ts">
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import business from '../../../../fixtures/affects/business.json'
import order from '../../../../fixtures/affects/order.json'
import shipping from '../../../../fixtures/affects/shipping.json'
import { builder } from '../builder'
import FormExample from '../components/FormExample.vue'

// The fields' `affects` show, hide and clear them by the other fields. Hidden fields aren't
// validated, and a field hidden with `hideAndClear` is cleared and submits nothing.
const examples = {
  business: { label: 'Business account', definition: business },
  shipping: { label: 'Shipping address', definition: shipping },
  order: { label: 'Order lines', definition: order },
}

const route = useRoute()
const name = computed(() =>
  Object.hasOwn(examples, String(route.params['example']))
    ? (route.params['example'] as keyof typeof examples)
    : 'business',
)
// TypeScript reads `version` in a JSON file as any string.
const definition = computed(() => examples[name.value].definition as unknown as JsonForm)
</script>

<template>
  <nav class="examples">
    <RouterLink v-for="(example, key) in examples" :key="key" :to="`/conditions/${key}`">
      {{ example.label }}
    </RouterLink>
  </nav>
  <!-- A new form for each example: useJsonForm reads its definition once. -->
  <FormExample :key="name" :definition="definition" :builder="builder" />
</template>

<style scoped>
.examples {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  margin-bottom: 1.5rem;
}

.examples a.router-link-active {
  font-weight: 600;
}
</style>
