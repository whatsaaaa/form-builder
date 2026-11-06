<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import { labelOf } from './labels'

defineProps<ValueFieldProps>()
</script>

<template>
  <label class="check">
    <input
      v-bind="inputProps"
      type="checkbox"
      :checked="input === true"
      :required="required"
      @change="setInput(($event.target as HTMLInputElement).checked)"
    />
    <span>{{ labelOf(field) }}</span>
    <small v-if="errors" class="error">{{ errors[0] }}</small>
  </label>
</template>
