<script setup lang="ts">
import type {
  SectionProps,
  SectionSlots,
} from '@whatsaaaa/form-builder-vue'

defineProps<SectionProps>()
defineSlots<SectionSlots>()
</script>

<template>
  <fieldset>
    <legend>{{ section.label }}</legend>
    <p v-if="section.description">{{ section.description }}</p>
    <slot />
  </fieldset>
</template>
