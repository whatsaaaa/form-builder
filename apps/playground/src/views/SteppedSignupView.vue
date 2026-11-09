<script setup lang="ts">
import { ref } from 'vue'
import { Form } from '@formisch/vue'
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { JsonFields, useJsonForm } from '@whatsaaaa/form-builder-vue'
import { fieldComponents } from '../components/fields/field-components'
import { layoutComponents } from '../components/layout/layout-components'

// A sign-up over three steps. Next validates the whole form, and only this step's issues block.
const definition: JsonForm = {
  version: '1',
  fields: [
    { name: 'email', type: 'email', required: true },
    {
      name: 'password',
      type: 'password',
      required: true,
      rules: [{ rule: 'minLength', value: 10, message: 'At least 10 characters' }],
    },
    { name: 'confirmPassword', type: 'password', label: 'Repeat the password', required: true },
    { name: 'firstName', type: 'text', label: 'First name', required: true },
    { name: 'lastName', type: 'text', label: 'Last name', required: true },
    { name: 'birthDate', type: 'date', label: 'Birth date' },
    {
      name: 'address',
      type: 'group',
      fields: [
        { name: 'city', type: 'text' },
        { name: 'zip', type: 'text', label: 'ZIP code', rules: [{ rule: 'digits' }] },
      ],
    },
    {
      name: 'topics',
      type: 'multiselect',
      label: 'Topics',
      ui: { widget: 'checkboxes' },
      options: [
        { value: 'news', label: 'News' },
        { value: 'offers', label: 'Offers' },
      ],
    },
    {
      name: 'acceptTerms',
      type: 'checkbox',
      label: 'I accept the terms',
      required: { message: 'Please accept the terms' },
    },
  ],
  formRules: [
    { rule: 'sameAs', field: 'confirmPassword', other: 'password', message: 'Passwords differ' },
  ],
  layout: {
    steps: [
      { id: 'account', label: 'Account', items: ['email', 'password', 'confirmPassword'] },
      {
        id: 'profile',
        label: 'About you',
        items: [
          { type: 'row', items: ['firstName', 'lastName'] },
          'birthDate',
          { type: 'row', items: [{ field: 'address.city', span: 8 }, 'address.zip'] },
        ],
      },
      {
        id: 'finish',
        label: 'Almost done',
        items: [{ type: 'paragraph', text: "Pick what you'd like to hear about." }, '*'],
      },
    ],
  },
}

const jsonForm = useJsonForm(definition, { components: fieldComponents, layoutComponents })
const { steps } = jsonForm
const submitted = ref<unknown>()
</script>

<template>
  <section class="example">
    <div class="panel">
      <ol class="stepper">
        <li
          v-for="(step, i) in steps.list"
          :key="step.step.id ?? i"
          :class="{ done: i < steps.index }"
          :aria-current="i === steps.index ? 'step' : undefined"
        >
          <span class="number">{{ i + 1 }}</span> {{ step.step.label }}
        </li>
      </ol>

      <Form class="form" :of="jsonForm.form" @submit="(output) => (submitted = output)">
        <JsonFields :of="jsonForm" />

        <div class="actions">
          <button v-if="!steps.isFirst" type="button" @click="steps.back()">Back</button>
          <button v-if="!steps.isLast" type="button" class="primary" @click="steps.next()">
            Next
          </button>
          <button v-else type="submit" class="primary">Sign up</button>
        </div>
      </Form>
    </div>

    <div class="panel">
      <h2>Submitted output</h2>
      <pre>{{ submitted === undefined ? 'Nothing submitted yet' : submitted }}</pre>

      <h2>JSON definition</h2>
      <pre>{{ definition }}</pre>
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

.stepper {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  margin-bottom: 1.5rem;
  padding: 0;
  list-style: none;
  color: var(--color-text);
  opacity: 0.8;
}

.stepper li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stepper .number {
  display: inline-grid;
  place-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border: 1px solid var(--color-border-hover);
  border-radius: 50%;
  font-size: 0.8rem;
}

.stepper [aria-current='step'] {
  font-weight: 600;
  color: var(--color-heading);
  opacity: 1;
}

.stepper [aria-current='step'] .number,
.stepper .done .number {
  border-color: hsla(160, 100%, 37%, 1);
  background: hsla(160, 100%, 37%, 1);
  color: white;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.form .actions button.primary {
  border-color: hsla(160, 100%, 37%, 1);
  background: hsla(160, 100%, 37%, 1);
  color: white;
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

pre {
  padding: 0.75rem;
  border-radius: 6px;
  background: var(--color-background-mute);
  font-size: 0.85rem;
  overflow-x: auto;
}
</style>
