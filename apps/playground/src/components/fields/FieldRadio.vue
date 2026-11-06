<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import { labelOf } from './labels'
import { optionsOf } from './options'

defineProps<ValueFieldProps>()
</script>

<template>
  <fieldset class="field">
    <legend>{{ labelOf(field) }}</legend>
    <label v-for="option in optionsOf(field)" :key="String(option.value)" class="check">
      <!-- The value comes from the definition, so true stays true, not 'true'. -->
      <input
        v-bind="inputProps"
        type="radio"
        :checked="option.value === input"
        @change="setInput(option.value)"
      />
      <span>{{ option.label }}</span>
    </label>
    <small v-if="errors" class="error">{{ errors[0] }}</small>
  </fieldset>
</template>
