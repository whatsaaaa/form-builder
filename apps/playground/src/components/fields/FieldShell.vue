<script setup lang="ts">
import type { JsonField } from '@whatsaaaa/form-builder-schema'
import { labelOf } from './labels'

// The label, hint and first error around an input, and a note while a fill loads its value. A
// group of choices uses a fieldset instead.
defineProps<{
  field: JsonField
  required: boolean
  errors: [string, ...string[]] | null
  pending?: boolean | undefined
}>()
</script>

<template>
  <label class="field">
    <span
      >{{ labelOf(field) }} <span v-if="required" class="required" aria-hidden="true">*</span></span
    >
    <slot />
    <small v-if="field.description" class="hint">{{ field.description }}</small>
    <small v-if="pending" class="hint">Loading…</small>
    <small v-if="errors" class="error">{{ errors[0] }}</small>
  </label>
</template>
