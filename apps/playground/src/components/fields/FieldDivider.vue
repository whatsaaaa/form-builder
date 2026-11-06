<script setup lang="ts">
import type { DisplayFieldProps } from '@whatsaaaa/form-builder-vue'

// Declared even though it's unused, so `field` isn't added to the <hr> as an attribute.
defineProps<DisplayFieldProps>()
</script>

<template>
  <hr />
</template>
