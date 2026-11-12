<script setup lang="ts">
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { shallowRef } from 'vue'
import type { Locale } from '../schema/locales'
import TranslatedForm from './TranslatedForm.vue'

const { definition } = defineProps<{ definition: JsonForm }>()

const state = shallowRef<{
  locale: Locale
  input?: Record<string, unknown>
}>({
  locale: 'en',
})
</script>

<template>
  <!-- A new key builds the form again, with the builder of the language. -->
  <TranslatedForm
    :key="state.locale"
    :definition
    :locale="state.locale"
    :initial-input="state.input"
    @locale="(locale, input) => (state = { locale, input })"
  />
</template>
