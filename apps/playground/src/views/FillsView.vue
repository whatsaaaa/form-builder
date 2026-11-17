<script setup lang="ts">
import { affects } from '@whatsaaaa/form-builder-affects'
import { type FillSource, fills } from '@whatsaaaa/form-builder-fills'
import {
  createSchemaBuilder,
  type FillErrorInfo,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import profileMap from '../../../../fixtures/fills/profile-map.json'
import profileSource from '../../../../fixtures/fills/profile-source.json'
import FormExample from '../components/FormExample.vue'

// A field's `fills` set other fields from its value. The map writes the values in the
// definition, so they are there at once, even on the first render. The sources here are fakes
// that answer after a delay, like a server: pick another profile before one answers, and the
// call before it is aborted, so the newest pick wins.
const examples = {
  map: { label: 'A map', definition: profileMap },
  source: { label: 'A delayed source', definition: profileSource },
}

interface Call {
  id: number
  source: string
  value: string
  status: 'pending' | 'aborted' | 'applied' | 'failed'
}

const calls = ref<Call[]>([])
let nextId = 0

/** Records a call of a source, and marks it aborted when its signal is. */
function record(source: string, value: unknown, signal: AbortSignal): Call {
  calls.value.unshift({ id: ++nextId, source, value: String(value), status: 'pending' })
  // The reactive proxy, so later changes show.
  const call = calls.value[0] as Call
  signal.addEventListener('abort', () => (call.status = 'aborted'), { once: true })
  return call
}

/** Waits `ms`, or rejects as soon as `signal` aborts. */
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })

const people: Record<string, Record<string, string>> = {
  a: {
    firstName: 'Marko',
    lastName: 'Petrović',
    email: 'marko.petrovic@example.com',
    'address.city': 'Beograd',
  },
  b: {
    firstName: 'Jelena',
    lastName: 'Jovanović',
    email: 'jelena.jovanovic@example.com',
    'address.city': 'Novi Sad',
  },
}

const profiles: FillSource = async (value, { signal }) => {
  const call = record('profiles', value, signal)
  await wait(1500, signal)
  const person = people[String(value)]
  if (!person) {
    call.status = 'failed'
    throw new Error(`There is no profile "${String(value)}"`)
  }
  call.status = 'applied'
  return person
}

const zipCodes: Record<string, string> = { '11000': 'Beograd', '21000': 'Novi Sad', '18000': 'Niš' }

const cities: FillSource = async (zip, { signal }) => {
  // Each keystroke aborts the wait before it, so only the last one is looked up.
  await wait(300, signal)
  const call = record('cities', zip, signal)
  await wait(800, signal)
  call.status = 'applied'
  return { 'address.city': zipCodes[String(zip)] ?? null }
}

// Made here, so the sources can write to this view's log.
const builder = createSchemaBuilder({
  extensions: [affects(), fills({ sources: { profiles, cities } })],
})

const fillError = ref<string>()
function onFillError(error: unknown, { trigger, value }: FillErrorInfo) {
  fillError.value = `The fill of "${trigger}" for "${String(value)}" failed: ${
    error instanceof Error ? error.message : String(error)
  }`
}

const route = useRoute()
const name = computed(() =>
  Object.hasOwn(examples, String(route.params['example']))
    ? (route.params['example'] as keyof typeof examples)
    : 'map',
)
// TypeScript reads `version` in a JSON file as any string.
const definition = computed(() => examples[name.value].definition as unknown as JsonForm)
</script>

<template>
  <nav class="examples">
    <RouterLink v-for="(example, key) in examples" :key="key" :to="`/fills/${key}`">
      {{ example.label }}
    </RouterLink>
  </nav>
  <p v-if="name === 'map'" class="intro">
    Profile A is the default, so the form starts filled. Edit a name, then pick another profile: the
    edited name stays. Clearing the profile empties every field it fills.
  </p>
  <p v-else class="intro">
    Each profile takes 1.5 seconds to load, and Profile C fails. Pick Profile A, then Profile B
    before A answers: A's call is aborted and B wins. The ZIP code looks up the city: try 11000,
    21000 or 18000.
  </p>
  <!-- A new form for each example: useJsonForm reads its definition once. -->
  <FormExample :key="name" :definition="definition" :builder="builder" :on-fill-error="onFillError">
    <template #status="{ fills: state }">
      <div class="status" aria-live="polite">
        <p>
          Pending:
          <strong>{{ state.pending.length ? state.pending.join(', ') : 'nothing' }}</strong>
        </p>
        <p v-if="fillError" class="error" role="alert">
          {{ fillError }}
          <button type="button" @click="fillError = undefined">Dismiss</button>
        </p>
        <template v-if="calls.length">
          <h2>Source calls</h2>
          <ol class="calls">
            <li v-for="call in calls" :key="call.id" :class="call.status">
              <code>{{ call.source }}({{ call.value }})</code> {{ call.status }}
            </li>
          </ol>
        </template>
      </div>
    </template>
  </FormExample>
</template>

<style scoped>
.examples {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  margin-bottom: 1rem;
}

.examples a.router-link-active {
  font-weight: 600;
}

.intro {
  max-width: 60ch;
  margin-bottom: 1.5rem;
}

.status {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

h2 {
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0.5rem;
  color: var(--color-heading);
}

.error {
  color: #d03050;
}

.error button {
  margin-left: 0.5rem;
  font: inherit;
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--color-border-hover);
  border-radius: 6px;
  color: var(--color-text);
  cursor: pointer;
  background: var(--color-background-mute);
}

.calls {
  padding-left: 1.25rem;
}

.calls .aborted {
  text-decoration: line-through;
  opacity: 0.6;
}

.calls .failed {
  color: #d03050;
}

.calls .applied {
  color: hsla(160, 100%, 37%, 1);
}
</style>
