<script setup lang="ts">
import type {
  ArrayFieldProps,
  ArrayFieldSlots,
} from '@whatsaaaa/form-builder-vue'

defineProps<ArrayFieldProps>()
defineSlots<ArrayFieldSlots>()
</script>

<template>
  <fieldset>
    <legend>{{ field.label }}</legend>
    <div v-for="(item, index) in items" :key="item">
      <slot :index="index" />
      <button type="button" @click="remove(index)">Remove</button>
    </div>
    <button type="button" @click="add()">Add</button>
    <small v-if="errors">{{ errors[0] }}</small>
  </fieldset>
</template>
