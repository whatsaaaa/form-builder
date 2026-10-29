<script setup lang="ts">
import { ref } from 'vue'
import { Field, Form, useForm } from '@formisch/vue'
import { createSchemaBuilder, type JsonField, type JsonForm } from '@whatsaaaa/form-builder-schema'

const { definition } = defineProps<{ definition: JsonForm }>()

const { build } = createSchemaBuilder()
const form = useForm({ schema: build(definition) })
const submitted = ref<unknown>()

// Fields without a name have no value (headings, dividers), so they get no input.
const fields = definition.fields.filter(
  (field): field is JsonField & { name: string } => field.name !== undefined,
)

const inputTypes: Record<string, string> = {
  text: 'text',
  email: 'email',
  password: 'password',
  number: 'number',
}

const autocomplete: Record<string, string> = {
  email: 'email',
  password: 'current-password',
}

// `discountPercent` -> `Discount percent`
const label = (name: string) => {
  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
</script>

<template>
  <section class="example">
    <div class="panel">
      <h2>Form</h2>
      <Form class="form" :of="form" @submit="(output) => (submitted = output)">
        <Field
          v-for="field in fields"
          :key="field.name"
          :of="form"
          :path="[field.name]"
          v-slot="store"
        >
          <label class="field">
            <span>{{ field.label ?? label(field.name) }}</span>
            <input
              v-model="store.input"
              v-bind="store.props"
              :type="inputTypes[field.type]"
              :autocomplete="autocomplete[field.type]"
            />
            <small v-if="store.errors" class="error">{{ store.errors[0] }}</small>
          </label>
        </Field>

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

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

input,
button {
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-hover);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
}

button {
  align-self: flex-start;
  cursor: pointer;
  background: var(--color-background-mute);
}

.error {
  color: #d03050;
}

pre {
  padding: 0.75rem;
  border-radius: 6px;
  background: var(--color-background-mute);
  font-size: 0.85rem;
  overflow-x: auto;
}
</style>
