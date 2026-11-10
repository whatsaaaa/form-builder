<script setup lang="ts">
import type { RowProps, RowSlots } from '@whatsaaaa/form-builder-vue'

defineProps<RowProps>()
defineSlots<RowSlots>()
</script>

<template>
  <div class="row">
    <div
      v-for="(span, index) in spans"
      :key="index"
      :style="{ gridColumn: `span ${span}` }"
    >
      <slot :index="index" />
    </div>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1rem;
}

/* The spans are for a wide screen. On a narrow one, each cell takes the whole row. */
@media (max-width: 640px) {
  .row > * {
    grid-column: 1 / -1 !important;
  }
}
</style>
