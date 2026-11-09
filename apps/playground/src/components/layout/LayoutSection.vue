<script setup lang="ts">
import type { SectionProps, SectionSlots } from '@whatsaaaa/form-builder-vue'

// A block with a title. `ui: { variant: 'card' }` gives it a border and a background.
defineProps<SectionProps>()
defineSlots<SectionSlots>()
</script>

<template>
  <fieldset class="section" :class="{ card: section.ui?.['variant'] === 'card' }">
    <legend v-if="section.label">{{ section.label }}</legend>
    <p v-if="section.description" class="description">{{ section.description }}</p>
    <slot />
  </fieldset>
</template>

<style scoped>
.section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.section > legend {
  float: left;
  width: 100%;
  padding: 0;
  margin-bottom: 0.25rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-heading);
}

.card {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background-soft);
}

.description {
  opacity: 0.7;
}
</style>
