<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import { computed } from 'vue'
import FieldShell from './FieldShell.vue'
import { labelOf } from './labels'
import { type Option, optionsOf } from './options'

const props = defineProps<ValueFieldProps>()

const options = computed(() => optionsOf(props.field))
// The form starts without a value, so nothing is picked yet.
const picked = computed(() => (Array.isArray(props.input) ? (props.input as unknown[]) : []))

const toggle = (option: Option, checked: boolean) =>
  props.setInput(
    checked
      ? [...picked.value, option.value]
      : picked.value.filter((value) => value !== option.value),
  )

const select = (event: Event) => {
  const selected = [...(event.target as HTMLSelectElement).selectedOptions]
  props.setInput(selected.map((element) => options.value[element.index]?.value))
}
</script>

<template>
  <fieldset v-if="field.ui?.widget === 'checkboxes'" class="field">
    <legend>
      {{ labelOf(field) }} <span v-if="required" class="required" aria-hidden="true">*</span>
    </legend>
    <label v-for="option in options" :key="String(option.value)" class="check">
      <input
        v-bind="inputProps"
        type="checkbox"
        :checked="picked.includes(option.value)"
        @change="toggle(option, ($event.target as HTMLInputElement).checked)"
      />
      <span>{{ option.label }}</span>
    </label>
    <small v-if="errors" class="error">{{ errors[0] }}</small>
  </fieldset>

  <FieldShell v-else :field="field" :required="required" :errors="errors">
    <select v-bind="inputProps" multiple @change="select">
      <option
        v-for="option in options"
        :key="String(option.value)"
        :selected="picked.includes(option.value)"
      >
        {{ option.label }}
      </option>
    </select>
  </FieldShell>
</template>
