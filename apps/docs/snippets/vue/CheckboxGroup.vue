<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import { computed } from 'vue'

const props = defineProps<ValueFieldProps>()

type Option = { value: string | number | boolean; label: string }
const options = computed(() => (props.field.options ?? []) as Option[])
const picked = computed(() =>
  Array.isArray(props.input) ? (props.input as unknown[]) : [],
)

// The list with the option in or out, in the order of the options.
function toggle(option: Option, checked: boolean) {
  props.setInput(
    options.value
      .filter((each) =>
        each === option ? checked : picked.value.includes(each.value),
      )
      .map((each) => each.value),
  )
}
</script>

<template>
  <fieldset>
    <legend>{{ field.label }}</legend>
    <label v-for="(option, index) in options" :key="index">
      <!-- Each checkbox of the field takes inputProps. -->
      <input
        v-bind="inputProps"
        type="checkbox"
        :checked="picked.includes(option.value)"
        @change="
          toggle(option, ($event.target as HTMLInputElement).checked)
        "
      />
      {{ option.label }}
    </label>
    <small v-if="errors">{{ errors[0] }}</small>
  </fieldset>
</template>
