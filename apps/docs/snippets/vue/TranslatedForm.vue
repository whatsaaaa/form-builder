<script setup lang="ts">
import { Form, getInput } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import { builders, type Locale } from '../schema/locales'
import { components } from './fields'

type Input = Record<string, unknown>

const props = defineProps<{
  definition: JsonForm
  locale: Locale
  initialInput?: Input
}>()
const emit = defineEmits<{ locale: [locale: Locale, input: Input] }>()

const jsonForm = useJsonForm(props.definition, {
  builder: builders[props.locale],
  components,
  // What the user typed in the form of the other language.
  initialInput: props.initialInput,
})
const other = props.locale === 'en' ? 'hr' : 'en'

function save(output: unknown) {
  console.log(output)
}
</script>

<template>
  <Form :of="jsonForm.form" @submit="save">
    <!-- Hands the input up, for the form of the other language. -->
    <button
      type="button"
      @click="emit('locale', other, getInput(jsonForm.form))"
    >
      {{ other === 'hr' ? 'Hrvatski' : 'English' }}
    </button>
    <JsonFields :of="jsonForm" />
    <button type="submit">Order</button>
  </Form>
</template>
