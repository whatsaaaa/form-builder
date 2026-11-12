<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import { computed } from 'vue'

const props = defineProps<ValueFieldProps>()

type Option = { value: string | number | boolean; label: string }
const options = computed(() => (props.field.options ?? []) as Option[])
</script>

<template>
  <fieldset>
    <legend>{{ field.label }}</legend>
    <label v-for="(option, index) in options" :key="index">
      <!-- Each radio takes inputProps: one name, one group. -->
      <input
        v-bind="inputProps"
        type="radio"
        :checked="input === option.value"
        @change="setInput(option.value)"
      />
      {{ option.label }}
    </label>
    <small v-if="errors">{{ errors[0] }}</small>
  </fieldset>
</template>
