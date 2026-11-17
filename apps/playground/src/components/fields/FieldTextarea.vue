<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import FieldShell from './FieldShell.vue'

defineProps<ValueFieldProps>()
</script>

<template>
  <FieldShell :field="field" :required="required" :errors="errors" :pending="pending">
    <textarea
      v-bind="inputProps"
      :value="typeof input === 'string' ? input : ''"
      :placeholder="field.placeholder"
      :required="required"
      :aria-busy="pending || undefined"
      rows="4"
      @input="setInput(($event.target as HTMLTextAreaElement).value)"
    />
  </FieldShell>
</template>
