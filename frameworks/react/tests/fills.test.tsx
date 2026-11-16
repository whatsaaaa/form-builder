import { Form, getInput, setInput } from '@formisch/react'
import { fills, type FillSource } from '@whatsaaaa/form-builder-fills'
import {
  createSchemaBuilder,
  type FillErrorInfo,
  type FillResult,
  type JsonField,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import {
  JsonFields,
  type JsonFormInstance,
  useJsonForm,
  type UseJsonFormOptions,
  type ValueFieldProps,
} from '@whatsaaaa/form-builder-react'
import { act, StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import profileMap from '../../../fixtures/fills/profile-map.json'
import { builtInComponents, TestInput, values } from './components'
import { form, mount, settle, type, update } from './helpers'

/** A source whose calls wait until the test answers them. */
function waitingSource() {
  const calls: {
    value: unknown
    signal: AbortSignal
    resolve: (values: FillResult) => void
    reject: (error: unknown) => void
  }[] = []
  const source: FillSource = (value, { signal }) =>
    new Promise((resolve, reject) => {
      calls.push({ value, signal, resolve, reject })
    })
  return { source, calls }
}

const profile = (extra: Partial<JsonField> = {}): JsonField => ({
  name: 'profile',
  type: 'select',
  options: [
    { value: 'a', label: 'Profile A' },
    { value: 'b', label: 'Profile B' },
    { value: 'c', label: 'Profile C' },
  ],
  fills: { source: 'profiles', fields: ['firstName', 'lastName', 'address.city'] },
  ...extra,
})

const person: JsonField[] = [
  { name: 'firstName', type: 'text', required: true },
  { name: 'lastName', type: 'text', required: true },
  { name: 'address', type: 'group', fields: [{ name: 'city', type: 'text' }] },
]

const withSource = (extra: Partial<JsonField> = {}) => form(profile(extra), ...person)

const marko = { firstName: 'Marko', lastName: 'Petrović', 'address.city': 'Beograd' }

/**
 * Mounts the definition in Formisch's `<Form>` with a builder that knows fills, with `profiles`
 * as its source. `current()` gives what `useJsonForm` returned on the last render, and
 * `rerender()` renders it again with other options.
 */
function mountFills(
  json: JsonForm,
  options: UseJsonFormOptions & { profiles?: FillSource } = {},
  { strict = false } = {},
) {
  const { profiles = () => null, ...rest } = options
  const builder = createSchemaBuilder({ extensions: [fills({ sources: { profiles } })] })
  const latest: { current?: JsonFormInstance } = {}
  function App(props: UseJsonFormOptions) {
    const jsonForm = useJsonForm(json, { builder, components: builtInComponents, ...props })
    useEffect(() => {
      latest.current = jsonForm
    })
    return (
      <Form of={jsonForm.form} onSubmit={() => {}}>
        <JsonFields of={jsonForm} />
      </Form>
    )
  }
  const element = document.createElement('div')
  document.body.append(element)
  const root = createRoot(element)
  const render = (props: UseJsonFormOptions) =>
    act(() =>
      root.render(strict ? <StrictMode>{<App {...props} />}</StrictMode> : <App {...props} />),
    )
  const unmount = () => act(() => root.unmount())
  onTestFinished(() => {
    unmount()
    element.remove()
  })
  render(rest)
  const current = () => latest.current as JsonFormInstance
  return {
    root: element,
    current,
    input: () => getInput(current().form) as Record<string, unknown>,
    rerender: (props: UseJsonFormOptions) => render({ ...rest, ...props }),
    unmount,
  }
}

/** Sets a field's input the way its component does, and waits for React. */
const set = (path: string, input: unknown) => update(() => values.get(path)?.setInput(input))

/** Answers a source's call, and waits until React has rendered what it set. */
const answer = (resolve: () => void) => update(resolve)

describe('a fill with a map', () => {
  const json = profileMap as unknown as JsonForm

  it('starts with the values for the default, on the first render, as the initial input', () => {
    const { root, current, input } = mountFills(json)
    expect(input()).toEqual({
      profile: 'a',
      firstName: 'Marko',
      lastName: 'Petrović',
      address: { city: 'Beograd' },
    })
    expect(root.querySelector<HTMLInputElement>('[data-path="firstName"] input')?.value).toBe(
      'Marko',
    )
    expect(current().form.isDirty).toBe(false)
  })

  it('sets the fields when the user chooses another option', async () => {
    const { input } = mountFills(json)
    await set('profile', 'b')
    expect(input()).toMatchObject({
      firstName: 'Jelena',
      lastName: 'Jovanović',
      address: { city: 'Novi Sad' },
    })
  })

  it('keeps a field the user edited, and blanks one the option has no value for', async () => {
    const { root, input } = mountFills(json)
    type(root, 'firstName', 'Marta')
    await set('profile', 'c')
    expect(input()).toMatchObject({
      firstName: 'Marta',
      lastName: 'Nikolić',
      address: { city: undefined },
    })
  })

  it('replaces what the user edited with "overwrite": "always"', async () => {
    const [trigger, ...others] = json.fields as JsonField[]
    const fill = { ...(trigger?.['fills'] as object), overwrite: 'always' }
    const always: JsonForm = {
      ...json,
      fields: [{ ...trigger, type: 'select', fills: fill }, ...others],
    }
    const { root, input } = mountFills(always)
    type(root, 'firstName', 'Marta')
    await set('profile', 'b')
    expect(input()).toMatchObject({ firstName: 'Jelena' })
  })

  it('empties every field it sets when the trigger is cleared, edited or not', async () => {
    const { root, input } = mountFills(json)
    type(root, 'firstName', 'Marta')
    await set('profile', undefined)
    expect(input()).toEqual({
      profile: undefined,
      firstName: undefined,
      lastName: undefined,
      address: { city: undefined },
    })
  })

  it('fills nothing as a record loads, and fills its fields when the user chooses again', async () => {
    const { input } = mountFills(json, {
      initialInput: { profile: 'b', firstName: 'Ana', lastName: 'Ilić' },
    })
    expect(input()).toEqual({
      profile: 'b',
      firstName: 'Ana',
      lastName: 'Ilić',
      address: { city: undefined },
    })
    await set('profile', 'c')
    expect(input()).toMatchObject({ firstName: 'Nikola', lastName: 'Nikolić' })
  })

  it('leaves the fields a record gives alone as the default of its trigger fills', () => {
    const { input } = mountFills(json, { initialInput: { firstName: 'Ana' } })
    expect(input()).toEqual({
      profile: 'a',
      firstName: 'Ana',
      lastName: 'Petrović',
      address: { city: 'Beograd' },
    })
  })

  it('runs for a value that app code sets', async () => {
    const { current, input } = mountFills(json)
    await update(() => setInput(current().form, { path: ['profile'], input: 'b' } as never))
    expect(input()).toMatchObject({ firstName: 'Jelena' })
  })
})

describe('a fill with a source', () => {
  it('runs once the form is mounted, and sets the values it starts with', async () => {
    const { source, calls } = waitingSource()
    const { current, input } = mountFills(withSource({ default: 'a' }), { profiles: source })
    expect(calls.map(({ value }) => value)).toEqual(['a'])
    expect(current().fills.pending).toEqual(['profile'])

    const resolve = calls[0]?.resolve
    await answer(() => resolve?.(marko))
    expect(input()).toMatchObject({ firstName: 'Marko', address: { city: 'Beograd' } })
    expect(current().fills.pending).toEqual([])
    expect(current().form.isDirty).toBe(false)
  })

  it('never runs as the form starts for a trigger the initial input gives', () => {
    const { source, calls } = waitingSource()
    const { current } = mountFills(withSource({ default: 'a' }), {
      profiles: source,
      initialInput: { profile: 'b' },
    })
    expect(calls).toEqual([])
    expect(current().fills.pending).toEqual([])
  })

  it('sets the values of a change as changes', async () => {
    const { source, calls } = waitingSource()
    const { current, input } = mountFills(withSource(), { profiles: source })
    await set('profile', 'b')
    const resolve = calls[0]?.resolve
    await answer(() => resolve?.({ firstName: 'Jelena', lastName: 'Jovanović' }))
    expect(input()).toMatchObject({ firstName: 'Jelena', lastName: 'Jovanović' })
    expect(current().form.isDirty).toBe(true)
  })

  it('applies only the newest value, and aborts the call before it', async () => {
    const { source, calls } = waitingSource()
    const { current, input } = mountFills(withSource(), { profiles: source })
    await set('profile', 'b')
    await set('profile', 'c')
    const [first, second] = calls
    expect(first?.signal.aborted).toBe(true)
    expect(second?.signal.aborted).toBe(false)

    await answer(() => first?.resolve({ firstName: 'Jelena' }))
    expect(input()).toMatchObject({ firstName: undefined })
    expect(current().fills.pending).toEqual(['profile'])
    await answer(() => second?.resolve({ firstName: 'Nikola' }))
    expect(input()).toMatchObject({ firstName: 'Nikola' })
    expect(current().fills.pending).toEqual([])
  })

  it('gives the pending prop to the trigger and the fields it sets while it waits', async () => {
    const { source, calls } = waitingSource()
    mountFills(form(profile(), ...person, { name: 'note', type: 'text' }), { profiles: source })
    const pending = () =>
      ['profile', 'firstName', 'address.city', 'note'].map((path) => values.get(path)?.pending)
    expect(pending()).toEqual([false, false, false, false])

    await set('profile', 'a')
    expect(pending()).toEqual([true, true, true, false])
    const resolve = calls[0]?.resolve
    await answer(() => resolve?.(marko))
    expect(pending()).toEqual([false, false, false, false])
  })

  it('renders the form again only when what is pending changes', async () => {
    const { source, calls } = waitingSource()
    const { root, current } = mountFills(withSource(), { profiles: source })
    const idle = current().fills
    type(root, 'lastName', 'Ilić')
    await settle()
    expect(current().fills).toBe(idle)

    await set('profile', 'a')
    const waiting = current().fills
    expect(waiting).not.toBe(idle)
    type(root, 'lastName', 'Jović')
    await settle()
    expect(current().fills).toBe(waiting)
    expect(waiting.isPending(['firstName'])).toBe(true)
    expect(calls).toHaveLength(1)
  })

  it('aborts its call when the form unmounts, and sets nothing after', async () => {
    const { source, calls } = waitingSource()
    const { current, unmount } = mountFills(withSource(), { profiles: source })
    await set('profile', 'a')
    const { form: store } = current()
    unmount()
    expect(calls[0]?.signal.aborted).toBe(true)
    const resolve = calls[0]?.resolve
    await answer(() => resolve?.(marko))
    expect(getInput(store)).toMatchObject({ firstName: undefined })
  })

  it('runs for a value a component sets as it mounts', () => {
    const { source, calls } = waitingSource()
    function Preset(props: ValueFieldProps) {
      const { setInput: set } = props
      const preset = props.path.join('.') === 'profile'
      useEffect(() => {
        if (preset) set('c')
      }, [preset, set])
      return <TestInput {...props} />
    }
    mountFills(withSource(), {
      profiles: source,
      components: { ...builtInComponents, select: Preset },
    })
    expect(calls.map(({ value }) => value)).toEqual(['c'])
  })
})

describe('fills in StrictMode', () => {
  it('run a load fill again after the first mount stops it, and set its values once', async () => {
    const { source, calls } = waitingSource()
    const { current, input } = mountFills(
      withSource({ default: 'a' }),
      { profiles: source },
      { strict: true },
    )
    expect(calls.map(({ value }) => value)).toEqual(['a', 'a'])
    expect(calls[0]?.signal.aborted).toBe(true)

    const resolve = calls[1]?.resolve
    await answer(() => resolve?.(marko))
    expect(input()).toMatchObject({ firstName: 'Marko' })
    expect(current().fills.pending).toEqual([])
    expect(current().form.isDirty).toBe(false)
  })
})

describe('the errors of fills', () => {
  it('go to onFillError, the one of the last render', async () => {
    const { source, calls } = waitingSource()
    const first = vi.fn<(error: unknown, info: FillErrorInfo) => void>()
    const second = vi.fn<(error: unknown, info: FillErrorInfo) => void>()
    const { rerender } = mountFills(withSource(), { profiles: source, onFillError: first })
    await set('profile', 'b')
    rerender({ onFillError: second })

    const failure = new Error('Down')
    const reject = calls[0]?.reject
    await answer(() => reject?.(failure))
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith(failure, { trigger: 'profile', value: 'b' })
  })

  it('keep the this of an onFillError method', async () => {
    const seen: unknown[] = []
    const options = {
      name: 'app',
      profiles: () => 'x' as never,
      onFillError(this: { name: string }) {
        seen.push(this.name)
      },
    }
    mountFills(withSource(), options)
    await set('profile', 'a')
    expect(seen).toEqual(['app'])
  })

  it('are thrown like an uncaught one without onFillError', async () => {
    const failure = new Error('Down')
    const caught: unknown[] = []
    const scheduler = globalThis as unknown as { queueMicrotask(callback: () => void): void }
    const queue = scheduler.queueMicrotask.bind(globalThis)
    const spy = vi.spyOn(scheduler, 'queueMicrotask').mockImplementation((callback) => {
      queue(() => {
        try {
          callback()
        } catch (error) {
          caught.push(error)
        }
      })
    })
    onTestFinished(() => spy.mockRestore())
    mountFills(withSource(), {
      profiles: () => {
        throw failure
      },
    })
    await set('profile', 'a')
    expect(caught).toEqual([failure])
  })
})

describe('the pending prop', () => {
  it('is left out in a form without fills', () => {
    mount(<Plain />)
    expect(values.get('name')).toBeDefined()
    expect(values.get('name')).not.toHaveProperty('pending')
  })
})

function Plain() {
  const jsonForm = useJsonForm(form({ name: 'name', type: 'text' }), {
    components: builtInComponents,
  })
  expect(jsonForm.fills.pending).toEqual([])
  return (
    <Form of={jsonForm.form} onSubmit={() => {}}>
      <JsonFields of={jsonForm} />
    </Form>
  )
}

describe('steps with fills', () => {
  const json: JsonForm = {
    ...withSource(),
    layout: {
      steps: [
        { id: 'who', items: ['profile', 'firstName', 'lastName'] },
        { id: 'where', items: ['address'] },
      ],
    },
  }

  it('wait for a pending fill before Next validates', async () => {
    const { source, calls } = waitingSource()
    const { current } = mountFills(json, { profiles: source })
    await set('profile', 'a')

    let moved: boolean | undefined
    await act(async () => {
      const next = current().steps.next()
      await new Promise((resolve) => setTimeout(resolve, 10))
      expect(moved).toBeUndefined()
      calls[0]?.resolve(marko)
      moved = await next
    })
    expect(moved).toBe(true)
    expect(current().steps.current.step.id).toBe('where')
  })

  it('validate what a fill left blank', async () => {
    const { source, calls } = waitingSource()
    const { current } = mountFills(json, { profiles: source })
    await set('profile', 'a')

    let moved: boolean | undefined
    await act(async () => {
      const next = current().steps.next()
      calls[0]?.resolve({ firstName: 'Marko' })
      moved = await next
    })
    expect(moved).toBe(false)
    expect(current().steps.current.step.id).toBe('who')
  })
})
