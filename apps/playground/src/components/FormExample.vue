<script setup lang="ts">
import { ref } from 'vue'
import { Field, Form, useForm } from '@formisch/vue'
import { createSchemaBuilder, type JsonField, type JsonForm } from '@whatsaaaa/form-builder-schema'

interface Option {
  value: string | number | boolean
  label: string
}

const { definition } = defineProps<{ definition: JsonForm }>()

const { build } = createSchemaBuilder()

// Fields without a name have no value (headings, dividers), so they get no input.
const hasValue = (field: JsonField): field is JsonField & { name: string } =>
  field.name !== undefined

// v-model on a multi-select or a checkbox group needs an array to start from.
const initialInput = Object.fromEntries(
  definition.fields
    .filter(hasValue)
    .filter((field) => field.type === 'multiselect')
    .map((field) => [field.name, []]),
)
const form = useForm({ schema: build(definition), initialInput })
const submitted = ref<unknown>()

const inputTypes: Record<string, string> = {
  email: 'email',
  password: 'password',
  number: 'number',
  url: 'url',
  tel: 'tel',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
}

// A select without options (they would load from an API) is a plain input here.
const inputType = (field: JsonField) => {
  if (field.type !== 'select') return inputTypes[field.type]
  return field.valueType === 'number' ? 'number' : 'text'
}

const autocomplete: Record<string, string> = {
  email: 'email',
  password: 'current-password',
}

const options = (field: JsonField) => (field.options ?? []) as Option[]
const isGroup = (field: JsonField) =>
  field.type === 'radio' || (field.type === 'multiselect' && field.ui?.widget === 'checkboxes')
const headingTag = (field: JsonField) => `h${typeof field.level === 'number' ? field.level : 2}`

const selectedFiles = (event: Event, field: JsonField) => {
  const files = [...((event.target as HTMLInputElement).files ?? [])]
  return field.multiple ? files : files[0]
}

// `discountPercent` -> `Discount percent`
const label = (field: JsonField & { name: string }) => {
  if (field.label) return field.label
  const words = field.name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
</script>

<template>
  <section class="example">
    <div class="panel">
      <h2>Form</h2>
      <Form class="form" :of="form" @submit="(output) => (submitted = output)">
        <template v-for="(field, index) in definition.fields" :key="field.name ?? index">
          <Field v-if="hasValue(field)" :of="form" :path="[field.name]" v-slot="store">
            <label v-if="field.type === 'checkbox'" class="check">
              <input v-model="store.input" v-bind="store.props" type="checkbox" />
              <span>{{ label(field) }}</span>
              <small v-if="store.errors" class="error">{{ store.errors[0] }}</small>
            </label>

            <fieldset v-else-if="isGroup(field)" class="field">
              <legend>{{ label(field) }}</legend>
              <label v-for="option in options(field)" :key="String(option.value)" class="check">
                <input
                  v-model="store.input"
                  v-bind="store.props"
                  :type="field.type === 'radio' ? 'radio' : 'checkbox'"
                  :value="option.value"
                />
                <span>{{ option.label }}</span>
              </label>
              <small v-if="store.errors" class="error">{{ store.errors[0] }}</small>
            </fieldset>

            <label v-else class="field">
              <span>{{ label(field) }}</span>
              <!-- v-model on a textarea wants a string, and the input of a built schema is unknown. -->
              <textarea
                v-if="field.type === 'textarea'"
                v-bind="store.props"
                :value="typeof store.input === 'string' ? store.input : ''"
                rows="4"
                @input="store.input = ($event.target as HTMLTextAreaElement).value"
              />
              <select
                v-else-if="field.type === 'select' && field.options"
                v-model="store.input"
                v-bind="store.props"
              >
                <option :value="undefined">Choose…</option>
                <option v-for="option in options(field)" :key="option.label" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <select
                v-else-if="field.type === 'multiselect'"
                v-model="store.input"
                v-bind="store.props"
                multiple
              >
                <option v-for="option in options(field)" :key="option.label" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <input
                v-else-if="field.type === 'file'"
                v-bind="store.props"
                type="file"
                :multiple="field.multiple === true"
                :accept="typeof field.accept === 'string' ? field.accept : undefined"
                @change="store.input = selectedFiles($event, field)"
              />
              <input
                v-else
                v-model="store.input"
                v-bind="store.props"
                :type="inputType(field)"
                :placeholder="field.placeholder"
                :autocomplete="autocomplete[field.type]"
              />
              <small v-if="field.description" class="hint">{{ field.description }}</small>
              <small v-if="store.errors" class="error">{{ store.errors[0] }}</small>
            </label>
          </Field>

          <component :is="headingTag(field)" v-else-if="field.type === 'heading'" class="heading">
            {{ field.text }}
          </component>
          <p v-else-if="field.type === 'paragraph'">{{ field.text }}</p>
          <hr v-else-if="field.type === 'divider'" />
        </template>

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

fieldset {
  border: none;
  padding: 0;
  margin: 0;
}

.check {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.heading {
  font-weight: 600;
  color: var(--color-heading);
}

hr {
  border: none;
  border-top: 1px solid var(--color-border);
}

input,
textarea,
select,
button {
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-hover);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
}

input[type='checkbox'],
input[type='radio'] {
  padding: 0;
}

button {
  align-self: flex-start;
  cursor: pointer;
  background: var(--color-background-mute);
}

.hint {
  color: var(--color-text);
  opacity: 0.7;
}

.error {
  flex-basis: 100%;
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
