<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import FieldShell from './FieldShell.vue'

defineProps<ValueFieldProps>()

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

const autocomplete: Record<string, string> = {
  email: 'email',
  password: 'current-password',
}
</script>

<template>
  <!-- A number input gives a string; setInput turns it into a number. -->
  <FieldShell :field="field" :errors="errors">
    <input
      v-bind="inputProps"
      :type="inputTypes[field.type] ?? (kind === 'number' ? 'number' : 'text')"
      :value="input ?? ''"
      :placeholder="field.placeholder"
      :required="required"
      :autocomplete="autocomplete[field.type]"
      @input="setInput(($event.target as HTMLInputElement).value)"
    />
  </FieldShell>
</template>
