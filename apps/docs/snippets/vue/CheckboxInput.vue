<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'

defineProps<ValueFieldProps>()
</script>

<template>
  <label>
    <input
      v-bind="inputProps"
      type="checkbox"
      :checked="input === true"
      @change="setInput(($event.target as HTMLInputElement).checked)"
    />
    {{ field.label }}
    <small v-if="errors">{{ errors[0] }}</small>
  </label>
</template>
