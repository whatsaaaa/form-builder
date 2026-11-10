<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import { computed } from 'vue'

const props = defineProps<ValueFieldProps>()

const accept = computed(() =>
  typeof props.field.accept === 'string' ? props.field.accept : undefined,
)
</script>

<template>
  <label>
    {{ field.label }}
    <!-- Never set a file input's value. setInput turns the FileList into files. -->
    <input
      v-bind="inputProps"
      type="file"
      :multiple="kind === 'array'"
      :accept="accept"
      @change="setInput(($event.target as HTMLInputElement).files)"
    />
    <small v-if="errors">{{ errors[0] }}</small>
  </label>
</template>
