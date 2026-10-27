<script setup lang="ts">
import { Field, Form, useForm } from "@formisch/vue";
import * as v from "valibot";

const LoginSchema = v.object({
  email: v.pipe(
    v.string(),
    v.nonEmpty("Please enter your email."),
    v.email("The email address is badly formatted.")
  ),
  password: v.pipe(
    v.string(),
    v.nonEmpty("Please enter your password."),
    v.minLength(8, "Your password must have 8 characters or more.")
  ),
});

const loginForm = useForm({
  schema: LoginSchema
});
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
