<script setup lang="ts">
import type {
  GroupFieldProps,
  GroupFieldSlots,
} from '@whatsaaaa/form-builder-vue'

defineProps<GroupFieldProps>()
defineSlots<GroupFieldSlots>()
</script>

<template>
  <fieldset>
    <legend>{{ field.label }}</legend>
    <slot />
  </fieldset>
</template>
