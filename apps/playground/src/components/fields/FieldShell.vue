<script setup lang="ts">
import type { JsonField } from '@whatsaaaa/form-builder-schema'
import { labelOf } from './labels'

// The label, hint and first error around an input. A group of choices uses a fieldset instead.
defineProps<{ field: JsonField; errors: [string, ...string[]] | null }>()
</script>

<template>
  <label class="field">
    <span>{{ labelOf(field) }}</span>
    <slot />
    <small v-if="field.description" class="hint">{{ field.description }}</small>
    <small v-if="errors" class="error">{{ errors[0] }}</small>
  </label>
</template>
