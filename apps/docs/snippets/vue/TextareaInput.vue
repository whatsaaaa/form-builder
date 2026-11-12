<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'

defineProps<ValueFieldProps>()
</script>

<template>
  <label>
    {{ field.label }}
    <textarea
      v-bind="inputProps"
      :value="String(input ?? '')"
      :placeholder="field.placeholder"
      :required="required"
      @input="setInput(($event.target as HTMLTextAreaElement).value)"
    />
    <small v-if="errors">{{ errors[0] }}</small>
  </label>
</template>
