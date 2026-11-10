<script setup lang="ts">
import { Form } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import {
  JsonField,
  JsonFields,
  useJsonForm,
} from '@whatsaaaa/form-builder-vue'
import { components } from './all-fields'

const { definition } = defineProps<{ definition: JsonForm }>()

const jsonForm = useJsonForm(definition, { components })

function save(output: unknown) {
  console.log(output)
}
</script>

<template>
  <Form :of="jsonForm.form" @submit="save">
    <main>
      <JsonFields :of="jsonForm" :except="['coupon', 'acceptTerms']" />
    </main>
    <aside>
      <JsonField :of="jsonForm" path="coupon" />
      <JsonField :of="jsonForm" path="acceptTerms" />
      <button type="submit">Place order</button>
    </aside>
  </Form>
</template>
