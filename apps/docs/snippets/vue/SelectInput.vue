<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import { computed } from 'vue'

const props = defineProps<ValueFieldProps>()

type Option = { value: string | number | boolean; label: string }
const options = computed(() => (props.field.options ?? []) as Option[])

// An element's value is a string, so each option's index stands for its value.
const selected = computed(() =>
  options.value.findIndex((option) => option.value === props.input),
)
</script>

<template>
  <label>
    {{ field.label }}
    <select
      v-bind="inputProps"
      :value="selected"
      @change="
        setInput(
          options[Number(($event.target as HTMLSelectElement).value)]
            ?.value,
        )
      "
    >
      <option :value="-1">Choose...</option>
      <option
        v-for="(option, index) in options"
        :key="index"
        :value="index"
      >
        {{ option.label }}
      </option>
    </select>
    <small v-if="errors">{{ errors[0] }}</small>
  </label>
</template>
