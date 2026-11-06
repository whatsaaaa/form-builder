<script setup lang="ts">
import type { ValueFieldProps } from '@whatsaaaa/form-builder-vue'
import FieldShell from './FieldShell.vue'

defineProps<ValueFieldProps>()
</script>

<template>
  <!-- setInput turns the FileList into a file, or into an array of files with `multiple`. -->
  <FieldShell :field="field" :errors="errors">
    <input
      v-bind="inputProps"
      type="file"
      :multiple="field.multiple === true"
      :accept="typeof field.accept === 'string' ? field.accept : undefined"
      :required="required"
      @change="setInput(($event.target as HTMLInputElement).files)"
    />
  </FieldShell>
</template>
