<script setup lang="ts">
import type { DisplayFieldProps } from '@whatsaaaa/form-builder-vue'

defineProps<DisplayFieldProps>()
</script>

<template>
  <h2>{{ field.text }}</h2>
</template>
