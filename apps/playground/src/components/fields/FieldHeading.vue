<script setup lang="ts">
import type { DisplayFieldProps } from '@whatsaaaa/form-builder-vue'

defineProps<DisplayFieldProps>()
</script>

<template>
  <component :is="`h${typeof field.level === 'number' ? field.level : 2}`" class="heading">
    {{ field.text }}
  </component>
</template>
