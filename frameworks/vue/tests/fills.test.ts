import { Form, getInput, isDirty, reset, setInput } from '@formisch/vue'
import { affects } from '@whatsaaaa/form-builder-affects'
import { type FillSource, fills } from '@whatsaaaa/form-builder-fills'
import {
  createSchemaBuilder,
  type FillErrorInfo,
  type JsonForm,
  type JsonLayout,
} from '@whatsaaaa/form-builder-schema'
import {
  JsonFields,
  type JsonFormInstance,
  useJsonForm,
  type UseJsonFormOptions,
} from '@whatsaaaa/form-builder-vue'
import { type Component, createApp, defineComponent, effectScope, h, nextTick } from 'vue'
import { describe, expect, it, onTestFinished } from 'vitest'
import profileMap from '../../../fixtures/fills/profile-map.json'
import profileSource from '../../../fixtures/fills/profile-source.json'
import { builtInComponents, layoutComponents, values } from './components'
import { form, mountForm, settle, type, withSetup } from './helpers'

/** A call of a source, which the test answers. */
interface Call {
  value: unknown
  signal: AbortSignal
  resolve(values: unknown): void
  reject(error: unknown): void
}

/** A source that waits for the test to answer each call, as a server would. */
function waitingSource() {
  const calls: Call[] = []
  const source: FillSource = (value, { signal }) =>
    new Promise((resolve, reject) => {
      calls.push({ value, signal, resolve, reject })
    })
  return { source, calls }
}

const marko = { firstName: 'Marko', lastName: 'Petrović', email: 'marko@example.com' }
const jelena = { firstName: 'Jelena', lastName: 'Jovanović', 'address.city': 'Novi Sad' }

/** A builder with fills whose `profiles` and `cities` sources the test answers. */
function sourceBuilder() {
  const profiles = waitingSource()
  const cities = waitingSource()
  const builder = createSchemaBuilder({
    extensions: [
      affects(),
      fills({ sources: { profiles: profiles.source, cities: cities.source } }),
    ],
  })
  return { builder, profiles: profiles.calls, cities: cities.calls }
}

const mapBuilder = createSchemaBuilder({ extensions: [fills()] })

/**
 * Mounts `<JsonFields>` in Formisch's `<Form>` like an app, and unmounts it when the test ends. The
 * form is made in the component that renders it, so it starts once that is mounted.
 */
function mountFills(json: unknown, options: UseJsonFormOptions) {
  const root = document.createElement('div')
  document.body.append(root)
  let jsonForm: JsonFormInstance | undefined
  const app = createApp(
    defineComponent({
      setup() {
        const instance = useJsonForm(json as JsonForm, {
          components: builtInComponents,
          layoutComponents,
          ...options,
        })
        jsonForm = instance
        return () =>
          h(
            Form as Component,
            { of: instance.form },
            { default: () => h(JsonFields, { of: instance }) },
          )
      },
    }),
  )
  app.mount(root)
  onTestFinished(() => {
    app.unmount()
    root.remove()
  })
  return { root, jsonForm: jsonForm as JsonFormInstance, unmount: () => app.unmount() }
}

/** Sets a field's input the way its component does, and waits for Vue. */
async function set(path: string, input: unknown) {
  values.get(path)?.setInput(input)
  await settle()
}

/** What the input at `path` shows. */
const shownAt = (root: HTMLElement, path: string) =>
  root.querySelector<HTMLInputElement>(`[data-path="${path}"] input`)?.value

/** The paths of the fields that show a pending fill. */
const busy = (root: HTMLElement) =>
  [...root.querySelectorAll('input[aria-busy="true"]')].map(
    (input) => input.closest<HTMLElement>('[data-path]')?.dataset['path'],
  )

describe('a fill with a map', () => {
  it('starts the form with the values of its default, on the first render', () => {
    const { root, jsonForm } = mountForm(profileMap as JsonForm, builtInComponents, {
      builder: mapBuilder,
    })

    expect(getInput(jsonForm.form)).toEqual({
      profile: 'a',
      firstName: 'Marko',
      lastName: 'Petrović',
      address: { city: 'Beograd' },
    })
    expect(shownAt(root, 'firstName')).toBe('Marko')
    expect(shownAt(root, 'address.city')).toBe('Beograd')
    expect(isDirty(jsonForm.form)).toBe(false)
  })

  it('fills the fields when another option is chosen, in groups too', async () => {
    const { root, jsonForm } = mountForm(profileMap as JsonForm, builtInComponents, {
      builder: mapBuilder,
    })
    await set('profile', 'b')

    expect(getInput(jsonForm.form)).toEqual({
      profile: 'b',
      firstName: 'Jelena',
      lastName: 'Jovanović',
      address: { city: 'Novi Sad' },
    })
    expect(shownAt(root, 'lastName')).toBe('Jovanović')
    expect(shownAt(root, 'address.city')).toBe('Novi Sad')
  })

  it('blanks a field the chosen option has no value for', async () => {
    const { jsonForm } = mountForm(profileMap as JsonForm, builtInComponents, {
      builder: mapBuilder,
    })
    await set('profile', 'c')
    expect(getInput(jsonForm.form)).toMatchObject({ firstName: 'Nikola', address: {} })

    await set('profile', 'other')
    expect(getInput(jsonForm.form)).toEqual({ profile: 'other', address: {} })
  })

  it('keeps a field the user edited, and sets it with "always"', async () => {
    const edited = mountForm(profileMap as JsonForm, builtInComponents, { builder: mapBuilder })
    type(edited.root, 'firstName', 'Marta')
    await settle()
    await set('profile', 'b')
    expect(getInput(edited.jsonForm.form)).toMatchObject({
      firstName: 'Marta',
      lastName: 'Jovanović',
    })

    const [profile, ...rest] = profileMap.fields
    const always = {
      ...profileMap,
      fields: [{ ...profile, fills: { ...profile?.fills, overwrite: 'always' } }, ...rest],
    }
    const overwritten = mountForm(always as JsonForm, builtInComponents, { builder: mapBuilder })
    type(overwritten.root, 'firstName', 'Marta')
    await settle()
    await set('profile', 'b')
    expect(getInput(overwritten.jsonForm.form)).toMatchObject({ firstName: 'Jelena' })
  })

  it('empties every field it set when the option is cleared, edited or not', async () => {
    const { root, jsonForm } = mountForm(profileMap as JsonForm, builtInComponents, {
      builder: mapBuilder,
    })
    type(root, 'firstName', 'Marta')
    await settle()
    await set('profile', undefined)

    expect(getInput(jsonForm.form)).toEqual({ address: {} })
    expect(shownAt(root, 'firstName')).toBe('')
  })

  it('fills nothing as a record starts, and leaves the fields it gives alone', async () => {
    const record = { profile: 'b', firstName: 'Ana', lastName: 'Ilić' }
    const { jsonForm } = mountForm(profileMap as JsonForm, builtInComponents, {
      builder: mapBuilder,
      initialInput: record,
    })
    expect(getInput(jsonForm.form)).toEqual({ ...record, address: {} })

    // The record's values weren't edited in this form, so the next option sets them.
    await set('profile', 'c')
    expect(getInput(jsonForm.form)).toEqual({
      profile: 'c',
      firstName: 'Nikola',
      lastName: 'Nikolić',
      address: {},
    })
  })

  it("fills a default's values over a record without the trigger, but not the fields it gives", () => {
    const { jsonForm } = mountForm(profileMap as JsonForm, builtInComponents, {
      builder: mapBuilder,
      initialInput: { firstName: 'Ana' },
    })

    expect(getInput(jsonForm.form)).toEqual({
      profile: 'a',
      firstName: 'Ana',
      lastName: 'Petrović',
      address: { city: 'Beograd' },
    })
    expect(isDirty(jsonForm.form)).toBe(false)
  })

  it('fills after a change made with Formisch', async () => {
    const { jsonForm } = mountForm(profileMap as JsonForm, builtInComponents, {
      builder: mapBuilder,
    })
    setInput(jsonForm.form, { path: ['profile'], input: 'b' } as never)
    await settle()
    expect(getInput(jsonForm.form)).toMatchObject({ firstName: 'Jelena' })
  })

  it('fills every field again after a reset', async () => {
    const { jsonForm } = mountForm(profileMap as JsonForm, builtInComponents, {
      builder: mapBuilder,
    })
    await set('profile', 'b')
    reset(jsonForm.form)
    await settle()
    expect(getInput(jsonForm.form)).toMatchObject({ profile: 'a', firstName: 'Marko' })
    expect(isDirty(jsonForm.form)).toBe(false)

    await set('profile', 'b')
    expect(getInput(jsonForm.form)).toEqual({
      profile: 'b',
      firstName: 'Jelena',
      lastName: 'Jovanović',
      address: { city: 'Novi Sad' },
    })
  })

  it('leaves a record as it is after a reset, and fills it on the next option', async () => {
    const record = { profile: 'b', firstName: 'Ana', lastName: 'Ilić' }
    const { jsonForm } = mountForm(profileMap as JsonForm, builtInComponents, {
      builder: mapBuilder,
      initialInput: record,
    })
    await set('profile', 'c')
    reset(jsonForm.form)
    await settle()
    expect(getInput(jsonForm.form)).toEqual({ ...record, address: {} })
    expect(isDirty(jsonForm.form)).toBe(false)

    await set('profile', 'c')
    expect(getInput(jsonForm.form)).toEqual({
      profile: 'c',
      firstName: 'Nikola',
      lastName: 'Nikolić',
      address: {},
    })
  })
})

describe('a fill with a source', () => {
  it('fills the fields when its values come, and shows them pending until then', async () => {
    const { builder, profiles } = sourceBuilder()
    const { root, jsonForm } = mountFills(profileSource, { builder })
    expect(jsonForm.fills.pending).toEqual([])

    await set('profile', 'a')
    expect(profiles.map(({ value }) => value)).toEqual(['a'])
    expect(jsonForm.fills.pending).toEqual(['profile'])
    expect(jsonForm.fills.isPending(['address', 'city'])).toBe(true)
    expect(busy(root)).toEqual(['profile', 'firstName', 'lastName', 'email', 'address.city'])

    profiles[0]?.resolve(marko)
    await settle()
    expect(jsonForm.fills.pending).toEqual([])
    expect(busy(root)).toEqual([])
    expect(getInput(jsonForm.form)).toEqual({ profile: 'a', ...marko, address: {} })
    expect(shownAt(root, 'email')).toBe('marko@example.com')
  })

  it('gives each value field `pending` only in a form with fills', async () => {
    const { builder } = sourceBuilder()
    mountFills(profileSource, { builder })
    expect(values.get('firstName')?.pending).toBe(false)

    mountForm(form({ name: 'plain', type: 'text' }), builtInComponents)
    expect(values.get('plain')?.pending).toBeUndefined()
  })

  it('applies only the values of the newest option, and aborts the call before it', async () => {
    const { builder, profiles } = sourceBuilder()
    const { jsonForm } = mountFills(profileSource, { builder })
    await set('profile', 'a')
    await set('profile', 'b')
    const [first, second] = profiles

    expect(first?.signal.aborted).toBe(true)
    expect(second?.signal.aborted).toBe(false)
    second?.resolve(jelena)
    first?.resolve(marko)
    await settle()
    expect(getInput(jsonForm.form)).toEqual({
      profile: 'b',
      firstName: 'Jelena',
      lastName: 'Jovanović',
      address: { city: 'Novi Sad' },
    })
  })

  it('keeps what the user types while its values are on their way', async () => {
    const { builder, profiles } = sourceBuilder()
    const { root, jsonForm } = mountFills(profileSource, { builder })
    await set('profile', 'a')
    type(root, 'firstName', 'Marta')
    profiles[0]?.resolve(marko)
    await settle()

    expect(getInput(jsonForm.form)).toMatchObject({ firstName: 'Marta', lastName: 'Petrović' })
  })

  it('sets the values of its default as the ones the form starts with, once it is mounted', async () => {
    const { builder, profiles } = sourceBuilder()
    const json = structuredClone(profileSource) as JsonForm
    ;(json.fields[0] as { default?: string }).default = 'a'
    let answered = false
    let input: unknown
    withSetup(() => {
      const jsonForm = useJsonForm(json, { builder })
      // Before the form is on the page, nothing is called.
      answered = profiles.length > 0
      input = getInput(jsonForm.form)
      return jsonForm
    })
    expect(answered).toBe(false)
    expect(input).toEqual({ profile: 'a', address: {} })

    const { root, jsonForm } = mountFills(json, { builder })
    const call = profiles.at(-1)
    expect(call?.value).toBe('a')
    call?.resolve(marko)
    await settle()
    expect(getInput(jsonForm.form)).toEqual({ profile: 'a', ...marko, address: {} })
    expect(isDirty(jsonForm.form)).toBe(false)

    // Formisch's reset goes back to them.
    type(root, 'firstName', 'Marta')
    reset(jsonForm.form)
    await settle()
    expect(getInput(jsonForm.form)).toMatchObject({ firstName: 'Marko' })
  })

  it('calls no source on a reset, and fills again after it', async () => {
    const { builder, profiles } = sourceBuilder()
    const json = structuredClone(profileSource) as JsonForm
    ;(json.fields[0] as { default?: string }).default = 'a'
    const { jsonForm } = mountFills(json, { builder })
    profiles[0]?.resolve(marko)
    await settle()
    await set('profile', 'b')
    profiles[1]?.resolve(jelena)
    await settle()

    reset(jsonForm.form)
    await settle()
    expect(profiles).toHaveLength(2)
    expect(getInput(jsonForm.form)).toEqual({ profile: 'a', ...marko, address: {} })
    expect(isDirty(jsonForm.form)).toBe(false)

    await set('profile', 'b')
    profiles[2]?.resolve(jelena)
    await settle()
    expect(getInput(jsonForm.form)).toEqual({
      profile: 'b',
      firstName: 'Jelena',
      lastName: 'Jovanović',
      address: { city: 'Novi Sad' },
    })
  })

  it('calls no source as a record starts', () => {
    const { builder, profiles } = sourceBuilder()
    mountFills(profileSource, { builder, initialInput: { profile: 'a', firstName: 'Ana' } })
    expect(profiles).toEqual([])
  })

  it('aborts its call when the form is unmounted, and sets nothing after', async () => {
    const { builder, profiles } = sourceBuilder()
    const { jsonForm, unmount } = mountFills(profileSource, { builder })
    await set('profile', 'a')
    unmount()

    expect(profiles[0]?.signal.aborted).toBe(true)
    profiles[0]?.resolve(marko)
    await settle()
    expect(getInput(jsonForm.form)).toMatchObject({ firstName: undefined })
  })

  it('starts at once outside a component, and stops with its scope', () => {
    const { builder, profiles } = sourceBuilder()
    const json = structuredClone(profileSource) as JsonForm
    ;(json.fields[0] as { default?: string }).default = 'a'
    const scope = effectScope()
    scope.run(() => useJsonForm(json, { builder }))

    expect(profiles.map(({ value }) => value)).toEqual(['a'])
    scope.stop()
    expect(profiles[0]?.signal.aborted).toBe(true)
  })

  it('passes its errors to onFillError, with the trigger and its value', async () => {
    const { builder, profiles, cities } = sourceBuilder()
    const errors: [unknown, FillErrorInfo][] = []
    const options = {
      builder,
      errors,
      // A method, which keeps its `this`.
      onFillError(this: { errors: typeof errors }, error: unknown, info: FillErrorInfo) {
        this.errors.push([error, info])
      },
    }
    const { jsonForm } = mountFills(profileSource, options)
    await set('profile', 'a')
    const failure = new Error('Profile a: HTTP 500')
    profiles[0]?.reject(failure)
    await settle()
    expect(errors).toEqual([[failure, { trigger: 'profile', value: 'a' }]])
    expect(jsonForm.fills.pending).toEqual([])

    await set('zip', '11000')
    cities[0]?.resolve({ 'address.city': ['Beograd'] })
    await settle()
    expect(errors[1]?.[0]).toBeInstanceOf(TypeError)
    expect(errors[1]?.[1]).toEqual({ trigger: 'zip', value: '11000', field: 'address.city' })
  })
})

describe('the steps of a form with fills', () => {
  const layout: JsonLayout = {
    steps: [
      { id: 'profile', label: 'Profile', items: ['profile', 'firstName', 'lastName'] },
      { id: 'contact', label: 'Contact', items: ['email', 'zip', 'address'] },
    ],
  }

  it('wait for a pending fill on Next, then validate the values it set', async () => {
    const { builder, profiles } = sourceBuilder()
    const { root, jsonForm } = mountFills({ ...profileSource, layout }, { builder })
    await set('profile', 'a')

    let moved: boolean | undefined
    void jsonForm.steps.next().then((result) => (moved = result))
    await settle()
    await settle()
    expect(moved).toBeUndefined()
    expect(root.querySelector('[data-path="firstName"] > small')).toBeNull()

    profiles[0]?.resolve(marko)
    await settle()
    await nextTick()
    expect(moved).toBe(true)
    expect(jsonForm.steps.current.step.id).toBe('contact')
  })

  it('stay on the step the user goes to while Next waits', async () => {
    const { builder, cities } = sourceBuilder()
    const threeSteps: JsonLayout = {
      steps: [
        { id: 'profile', label: 'Profile', items: ['profile', 'firstName', 'lastName'] },
        { id: 'contact', label: 'Contact', items: ['email', 'zip'] },
        { id: 'address', label: 'Address', items: ['address'] },
      ],
    }
    const { jsonForm } = mountFills(
      { ...profileSource, layout: threeSteps },
      { builder, initialInput: { firstName: 'Ana', lastName: 'Ilić' } },
    )
    expect(await jsonForm.steps.next()).toBe(true)
    await set('zip', '11000')

    const moved = jsonForm.steps.next()
    await settle()
    await settle()
    jsonForm.steps.back()
    cities[0]?.resolve({ 'address.city': 'Beograd' })
    expect(await moved).toBe(false)
    expect(jsonForm.steps.current.step.id).toBe('profile')
  })

  it("don't wait on Back", async () => {
    const { builder, profiles } = sourceBuilder()
    const { jsonForm } = mountFills(
      { ...profileSource, layout },
      { builder, initialInput: { firstName: 'Ana', lastName: 'Ilić' } },
    )
    expect(await jsonForm.steps.next()).toBe(true)
    await set('zip', '11000')
    jsonForm.steps.back()
    expect(jsonForm.steps.current.step.id).toBe('profile')
    expect(profiles).toEqual([])
  })
})
