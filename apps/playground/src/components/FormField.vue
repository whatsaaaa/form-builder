<script setup lang="ts">
import { computed } from 'vue'
import { Field, FieldArray, insert, remove, type FormStore } from '@formisch/vue'
import type { JsonField } from '@whatsaaaa/form-builder-schema'
import type * as v from 'valibot'

interface Option {
  value: string | number | boolean
  label: string
}

type Path = readonly (string | number)[]

const { form, field, path } = defineProps<{
  form: FormStore<v.ObjectSchema<v.ObjectEntries, undefined>>
  field: JsonField
  /** Where the value is, e.g. `['lines', 0, 'product']`. A heading gets its parent's path. */
  path: Path
}>()

// The paths come from the definition at runtime, so the schema's type can't check them.
const fieldPath = (path: Path) => path as unknown as [string]
const arrayPath = (path: Path) => path as never

const children = computed(() => (Array.isArray(field.fields) ? (field.fields as JsonField[]) : []))
const childPath = (child: JsonField, base: Path) =>
  child.name === undefined ? base : [...base, child.name]
// The field of a list of single values. It has no name: its value is the item itself.
const itemField = computed(() =>
  typeof field.of === 'object' && field.of !== null ? (field.of as JsonField) : undefined,
)

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
const isChoiceGroup = (field: JsonField) =>
  field.type === 'radio' || (field.type === 'multiselect' && field.ui?.widget === 'checkboxes')
const headingTag = (field: JsonField) => `h${typeof field.level === 'number' ? field.level : 2}`

const selectedFiles = (event: Event, field: JsonField) => {
  const files = [...((event.target as HTMLInputElement).files ?? [])]
  return field.multiple ? files : files[0]
}

// `discountPercent` -> `Discount percent`
const label = (field: JsonField) => {
  if (field.label) return field.label
  const words = (field.name ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
</script>

<template>
  <component :is="headingTag(field)" v-if="field.type === 'heading'" class="heading">
    {{ field.text }}
  </component>
  <p v-else-if="field.type === 'paragraph'">{{ field.text }}</p>
  <hr v-else-if="field.type === 'divider'" />

  <fieldset v-else-if="field.type === 'group'" class="container">
    <legend>{{ label(field) }}</legend>
    <FormField
      v-for="(child, index) in children"
      :key="child.name ?? index"
      :form="form"
      :field="child"
      :path="childPath(child, path)"
    />
  </fieldset>

  <FieldArray v-else-if="field.type === 'array'" :of="form" :path="arrayPath(path)" v-slot="list">
    <fieldset class="container">
      <legend>{{ label(field) }}</legend>
      <div v-for="(item, index) in list.items" :key="item" class="item">
        <FormField v-if="itemField" :form="form" :field="itemField" :path="[...path, index]" />
        <template v-else>
          <FormField
            v-for="(child, childIndex) in children"
            :key="child.name ?? childIndex"
            :form="form"
            :field="child"
            :path="childPath(child, [...path, index])"
          />
        </template>
        <button type="button" @click="remove(form, { path: arrayPath(path), at: index })">
          Remove
        </button>
      </div>
      <button type="button" @click="insert(form, { path: arrayPath(path) })">Add</button>
      <small v-if="list.errors" class="error">{{ list.errors[0] }}</small>
    </fieldset>
  </FieldArray>

  <Field v-else :of="form" :path="fieldPath(path)" v-slot="store">
    <label v-if="field.type === 'checkbox'" class="check">
      <input v-model="store.input" v-bind="store.props" type="checkbox" />
      <span>{{ label(field) }}</span>
      <small v-if="store.errors" class="error">{{ store.errors[0] }}</small>
    </label>

    <fieldset v-else-if="isChoiceGroup(field)" class="field">
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
</template>

<style scoped>
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

.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.container legend {
  padding: 0 0.25rem;
  font-weight: 600;
  color: var(--color-heading);
}

.item {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px dashed var(--color-border);
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
</style>
