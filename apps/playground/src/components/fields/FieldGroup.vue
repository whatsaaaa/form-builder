<script setup lang="ts">
import type { GroupFieldProps, GroupFieldSlots } from '@whatsaaaa/form-builder-vue'
import { labelOf } from './labels'

defineProps<GroupFieldProps>()
defineSlots<GroupFieldSlots>()
</script>

<template>
  <fieldset class="container">
    <legend>{{ labelOf(field) }}</legend>
    <slot />
  </fieldset>
</template>
