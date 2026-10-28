<script setup lang="ts">
import { Field, Form, useForm } from '@formisch/vue'
import { createSchemaBuilder, type JsonFormSchema } from '@whatsaaaa/form-builder-valibot'

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
</script>

<template>
  <div class="about">
    <Form class="form" :of="loginForm" @submit="(output) => console.log(output)">
      <Field :of="loginForm" :path="['email']" v-slot="field">
        <input type="text" v-model="field.input" required />
        <span v-if="field.errors">{{ field.errors }}</span>
      </Field>

      <Field :of="loginForm" :path="['password']" v-slot="field">
        <input type="password" v-model="field.input" required />
        <span v-if="field.errors">{{ field.errors }}</span>
      </Field>

      <input type="submit" />
    </Form>
  </div>
</template>

<style>
.form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

@media (min-width: 1024px) {
  .about {
    min-height: 100vh;
    display: flex;
    align-items: center;
  }
}
</style>
