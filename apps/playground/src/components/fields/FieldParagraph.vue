<script setup lang="ts">
import type { DisplayFieldProps } from '@whatsaaaa/form-builder-vue'

defineProps<DisplayFieldProps>()
</script>

<template>
  <p>{{ field.text }}</p>
</template>
