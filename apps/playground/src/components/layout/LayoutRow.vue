<script setup lang="ts">
import type { RowProps, RowSlots } from '@whatsaaaa/form-builder-vue'

// One line of a 12-column grid. Each cell takes its span, until the row is too narrow for that:
// then each cell takes the whole row, one under the other.
defineProps<RowProps>()
defineSlots<RowSlots>()
</script>

<template>
  <div class="row">
    <div class="cells">
      <div
        v-for="(span, index) in spans"
        :key="index"
        class="cell"
        :data-span="span"
        :style="{ '--span': span }"
      >
        <slot :index="index" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The row is the container its cells ask about, so a row inside a narrow cell stacks too. */
.row {
  container-type: inline-size;
}

.cells {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem 1.5rem;
  align-items: start;
}

.cell {
  grid-column: span var(--span);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

@container (max-width: 30rem) {
  .cell {
    grid-column: 1 / -1;
  }
}
</style>
