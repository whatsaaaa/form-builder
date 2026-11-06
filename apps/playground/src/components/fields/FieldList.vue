<script setup lang="ts">
import type { ArrayFieldProps, ArrayFieldSlots } from '@whatsaaaa/form-builder-vue'
import { labelOf } from './labels'

defineProps<ArrayFieldProps>()
defineSlots<ArrayFieldSlots>()
</script>

<template>
  <fieldset class="container">
    <legend>{{ labelOf(field) }}</legend>
    <div v-for="(item, index) in items" :key="item" class="item">
      <slot :index="index" />
      <button type="button" @click="remove(index)">Remove</button>
    </div>
    <button type="button" @click="add()">Add</button>
    <small v-if="errors" class="error">{{ errors[0] }}</small>
  </fieldset>
</template>
