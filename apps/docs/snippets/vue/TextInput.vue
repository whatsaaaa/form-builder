<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'

defineProps<ValueFieldProps>()

// The native input for each type. The rest are text.
const inputTypes: Record<string, string> = {
  email: 'email',
  password: 'password',
  number: 'number',
  url: 'url',
  tel: 'tel',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
}
</script>

<template>
  <label>
    {{ field.label }}
    <input
      v-bind="inputProps"
      :type="inputTypes[field.type] ?? 'text'"
      :value="String(input ?? '')"
      :placeholder="field.placeholder"
      :required="required"
      @input="setInput(($event.target as HTMLInputElement).value)"
    />
    <small v-if="errors">{{ errors[0] }}</small>
  </label>
</template>
