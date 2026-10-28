<script setup lang="ts">
import { ref } from 'vue'
import { Field, Form, useForm } from '@formisch/vue'
import { createSchemaBuilder, type JsonFormSchema } from '@whatsaaaa/form-builder-schema'

const jsonSchema: JsonFormSchema = {
  version: '1',
  fields: [
    {
      name: 'email',
      type: 'email',
      required: { message: 'Email is required' },
      rules: [{ rule: 'email', message: "That doesn't look like an email" }],
    },
    {
      name: 'password',
      type: 'password',
      required: true,
      rules: [{ rule: 'minLength', value: 10, message: 'At least 10 characters' }],
    },
  ],
}

const build = createSchemaBuilder()
const schema = build(jsonSchema)
const loginForm = useForm({ schema })

const submitted = ref<unknown>()
</script>

<template>
  <section class="example">
    <div class="panel">
      <h2>Form</h2>
      <Form class="form" :of="loginForm" @submit="(output) => (submitted = output)">
        <Field :of="loginForm" :path="['email']" v-slot="field">
          <label class="field">
            <span>Email</span>
            <input v-model="field.input" v-bind="field.props" type="text" autocomplete="email" />
            <small v-if="field.errors" class="error">{{ field.errors[0] }}</small>
          </label>
        </Field>

        <Field :of="loginForm" :path="['password']" v-slot="field">
          <label class="field">
            <span>Password</span>
            <input
              v-model="field.input"
              v-bind="field.props"
              type="password"
              autocomplete="current-password"
            />
            <small v-if="field.errors" class="error">{{ field.errors[0] }}</small>
          </label>
        </Field>

        <button type="submit">Submit</button>
      </Form>
    </div>

    <div class="panel">
      <h2>JSON definition</h2>
      <pre>{{ jsonSchema }}</pre>

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
