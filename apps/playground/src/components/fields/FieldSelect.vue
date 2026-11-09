<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import { computed } from 'vue'
import FieldShell from './FieldShell.vue'
import { optionsOf } from './options'

const props = defineProps<ValueFieldProps>()

const options = computed(() => optionsOf(props.field))

// Index 0 is "Choose…", so an option's index is one less. Its value comes from the definition,
// so a number option stays a number.
const select = (event: Event) =>
  props.setInput(options.value[(event.target as HTMLSelectElement).selectedIndex - 1]?.value)
</script>

<template>
  <FieldShell :field="field" :required="required" :errors="errors">
    <select v-if="options.length" v-bind="inputProps" :required="required" @change="select">
      <option :selected="input === undefined">Choose…</option>
      <option
        v-for="option in options"
        :key="String(option.value)"
        :selected="option.value === input"
      >
        {{ option.label }}
      </option>
    </select>
    <!-- Without options, they would load from an API. A number setInput turns into a number. -->
    <input
      v-else
      v-bind="inputProps"
      :type="kind === 'number' ? 'number' : 'text'"
      :value="input ?? ''"
      :required="required"
      @input="setInput(($event.target as HTMLInputElement).value)"
    />
  </FieldShell>
</template>
