<script setup lang="ts">
import { ref } from 'vue'
import { Form, useForm } from '@formisch/vue'
import {
  createSchemaBuilder,
  getInitialInput,
  type JsonField,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import FormField from './FormField.vue'

const { definition } = defineProps<{ definition: JsonForm }>()

const { build } = createSchemaBuilder()

const hasName = (field: JsonField): field is JsonField & { name: string } =>
  field.name !== undefined

// v-model on a multi-select or a checkbox group needs an array to start from.
const multiselects = Object.fromEntries(
  definition.fields
    .filter(hasName)
    .filter((field) => field.type === 'multiselect')
    .map((field) => [field.name, []]),
)
const form = useForm({
  schema: build(definition),
  initialInput: { ...multiselects, ...getInitialInput(definition) },
})
const submitted = ref<unknown>()
</script>

<template>
  <section class="example">
    <div class="panel">
      <h2>Form</h2>
      <Form class="form" :of="form" @submit="(output) => (submitted = output)">
        <FormField
          v-for="(field, index) in definition.fields"
          :key="field.name ?? index"
          :form="form"
          :field="field"
          :path="hasName(field) ? [field.name] : []"
        />

        <button type="submit">Submit</button>
      </Form>
    </div>

    <div class="panel">
      <h2>JSON definition</h2>
      <pre>{{ definition }}</pre>

      <h2>Submitted output</h2>
      <pre>{{ submitted === undefined ? 'Nothing submitted yet' : submitted }}</pre>
    </div>
  </section>
</template>

<style scoped>
.example {
  display: grid;
  gap: 2rem;
}

/* Grid items default to `min-width: auto`, which lets wide <pre> blocks overflow the viewport. */
.panel {
  min-width: 0;
}

@media (min-width: 768px) {
  .example {
    grid-template-columns: 1fr 1fr;
    align-items: start;
  }
}

h2 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--color-heading);
}

h2:not(:first-child) {
  margin-top: 1.5rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

button {
  align-self: flex-start;
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-hover);
  border-radius: 6px;
  color: var(--color-text);
  cursor: pointer;
  background: var(--color-background-mute);
}

pre {
  padding: 0.75rem;
  border-radius: 6px;
  background: var(--color-background-mute);
  font-size: 0.85rem;
  overflow-x: auto;
}
</style>
