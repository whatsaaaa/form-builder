import { Form, type FormStore, getErrors, setErrors, submit as requestSubmit } from '@formisch/vue'
import type { JsonForm, JsonLayout } from '@whatsaaaa/form-builder-schema'
import {
  JsonFields,
  type JsonFormInstance,
  useJsonForm,
  type UseJsonFormOptions,
} from '@whatsaaaa/form-builder-vue'
import { type Component, defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { arrays, builtInComponents, layoutComponents } from './components'
import { errorAt, mount, settle, type, withSetup } from './helpers'

const fields: JsonForm['fields'] = [
  { name: 'email', type: 'email', required: true },
  { name: 'name', type: 'text', required: true },
  { name: 'city', type: 'text', required: true },
  { name: 'zip', type: 'text' },
  {
    name: 'lines',
    type: 'array',
    required: { message: 'Add a line' },
    fields: [{ name: 'product', type: 'text', required: true }],
  },
  { name: 'code', type: 'text', required: true },
]

// The steps reorder the fields: name comes before email.
const layout: JsonLayout = {
  steps: [
    { id: 'you', label: 'You', items: ['name', 'email'] },
    { id: 'where', label: 'Where', items: [{ type: 'row', items: ['city', 'zip'] }, 'lines'] },
    { id: 'code', label: 'Code', items: ['code'] },
  ],
}

const json = (extra: Partial<JsonForm> = {}): JsonForm => ({
  version: '1',
  fields,
  layout,
  ...extra,
})

/**
 * Mounts the form with `<JsonFields>` for the current step, the way an app uses steps. Without an
 * `onSubmit` of the app's own, the outputs it submits are in `submitted`.
 */
function mountSteps(
  definition: JsonForm = json(),
  options: UseJsonFormOptions = {},
  onSubmit?: (form: FormStore) => unknown,
) {
  const submitted: unknown[] = []
  const jsonForm = withSetup(() =>
    useJsonForm(definition, { components: builtInComponents, layoutComponents, ...options }),
  )
  const root = mount(
    defineComponent({
      setup: () => () =>
        h(
          Form as Component,
          {
            of: jsonForm.form,
            onSubmit: (output: unknown) =>
              onSubmit ? onSubmit(jsonForm.form) : submitted.push(output),
          },
          {
            default: () => [
              h('p', { 'data-step': '' }, jsonForm.steps.current.step.label),
              h(JsonFields, { of: jsonForm }),
            ],
          },
        ),
    }),
  )
  return { root, jsonForm: jsonForm as JsonFormInstance, submitted }
}

/** The paths of the value fields on show, in order. */
const shown = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[data-role="value"]')].map(
    (element) => element.dataset['path'],
  )

const stepOf = (root: HTMLElement) => root.querySelector('[data-step]')?.textContent

async function next(jsonForm: JsonFormInstance) {
  const moved = await jsonForm.steps.next()
  await settle()
  return moved
}

async function fillFirstStep(root: HTMLElement, jsonForm: JsonFormInstance) {
  type(root, 'email', 'ana@example.com')
  type(root, 'name', 'Ana')
  expect(await next(jsonForm)).toBe(true)
}

/** Fills every step with what the schema takes, up to the last one. */
async function fillEveryStep(root: HTMLElement, jsonForm: JsonFormInstance) {
  type(root, 'email', 'milica@example.com')
  type(root, 'name', 'Milica')
  expect(await next(jsonForm)).toBe(true)
  type(root, 'city', 'Beograd')
  arrays.get('lines')?.add()
  await settle()
  type(root, 'lines.0.product', 'Olovka')
  expect(await next(jsonForm)).toBe(true)
  type(root, 'code', 'NS-21000')
}

/**
 * A submit handler like an app's for a server that rejects what the schema took: it waits for the
 * answer, and sets each message on its field with Formisch's `setErrors`.
 */
const rejecting =
  (...issues: [path: (string | number)[], message: string][]) =>
  async (form: FormStore) => {
    await new Promise((resolve) => setTimeout(resolve))
    for (const [path, message] of issues) setErrors(form, { path, errors: [message] } as never)
  }

/** Submits, and waits until the server has answered and the steps have gone where they go. */
async function submitAndSettle(jsonForm: JsonFormInstance) {
  requestSubmit(jsonForm.form)
  for (let i = 0; i < 4; i++) await settle()
}

describe('steps', () => {
  it('renders the first step, and knows where it is', () => {
    const { root, jsonForm } = mountSteps()
    const { steps } = jsonForm

    expect(shown(root)).toEqual(['name', 'email'])
    expect(steps.list.map((step) => step.step.id)).toEqual(['you', 'where', 'code'])
    expect([steps.index, steps.isFirst, steps.isLast]).toEqual([0, true, false])
    expect(steps.current).toBe(steps.list[0])
  })

  it('stays on a step with issues, shows them, and focuses the first in layout order', async () => {
    const { root, jsonForm } = mountSteps()

    expect(await next(jsonForm)).toBe(false)
    expect(stepOf(root)).toBe('You')
    expect([errorAt(root, 'name'), errorAt(root, 'email')]).toEqual(['Required', 'Required'])
    expect(document.activeElement).toBe(root.querySelector('[data-path="name"] input'))
  })

  it('moves on when the step has no issues, and the next step starts clean', async () => {
    const { root, jsonForm } = mountSteps()
    await fillFirstStep(root, jsonForm)

    expect(stepOf(root)).toBe('Where')
    expect(shown(root)).toEqual(['city', 'zip'])
    // Next validated the whole form, but this step's errors were cleared when it came up.
    expect(errorAt(root, 'city')).toBeNull()
    expect(getErrors(jsonForm.form, { path: ['lines'] } as never)).toBeNull()
    expect(getErrors(jsonForm.form, { path: ['code'] } as never)).toEqual(['Required'])
  })

  it('goes back without validating, and keeps what each step holds', async () => {
    const { root, jsonForm } = mountSteps()
    await fillFirstStep(root, jsonForm)
    expect(await next(jsonForm)).toBe(false)
    expect(errorAt(root, 'city')).toBe('Required')

    jsonForm.steps.back()
    await settle()
    expect(stepOf(root)).toBe('You')
    expect((root.querySelector('[data-path="name"] input') as HTMLInputElement).value).toBe('Ana')

    expect(await next(jsonForm)).toBe(true)
    // It was seen, so it keeps its errors.
    expect(errorAt(root, 'city')).toBe('Required')
    jsonForm.steps.back()
    jsonForm.steps.back()
    await settle()
    expect(jsonForm.steps.index).toBe(0)
  })

  it('blocks on the issues of an array and the fields of its items', async () => {
    const { root, jsonForm } = mountSteps()
    await fillFirstStep(root, jsonForm)
    type(root, 'city', 'Graz')

    expect(await next(jsonForm)).toBe(false)
    expect(root.textContent).toContain('Add a line')
  })

  it('shows a step as the user left it, not with the errors of validating the one before', async () => {
    const { root, jsonForm } = mountSteps()
    await fillFirstStep(root, jsonForm)
    type(root, 'zip', '1010')
    jsonForm.steps.back()
    await settle()

    expect(await next(jsonForm)).toBe(true)
    expect(errorAt(root, 'city')).toBeNull()
    expect((root.querySelector('[data-path="zip"] input') as HTMLInputElement).value).toBe('1010')
  })

  it('revalidates a step that failed Next as the user fixes it', async () => {
    const { root, jsonForm } = mountSteps()
    await next(jsonForm)

    type(root, 'name', 'Ana')
    await settle()
    expect(errorAt(root, 'name')).toBeNull()
    expect(errorAt(root, 'email')).toBe('Required')
  })

  it('revalidates a step that failed Next when the user comes back to it', async () => {
    const { root, jsonForm } = mountSteps()
    await fillFirstStep(root, jsonForm)
    expect(await next(jsonForm)).toBe(false)
    jsonForm.steps.back()
    await settle()
    expect(await next(jsonForm)).toBe(true)
    expect(errorAt(root, 'city')).toBe('Required')

    type(root, 'city', 'Graz')
    await settle()
    expect(errorAt(root, 'city')).toBeNull()
  })

  it('revalidates on the event `revalidate` names', async () => {
    const { root, jsonForm } = mountSteps(json(), { revalidate: 'blur' })
    await next(jsonForm)
    const input = root.querySelector('[data-path="name"] input') as HTMLInputElement

    type(root, 'name', 'Ana')
    input.dispatchEvent(new Event('change'))
    input.dispatchEvent(new Event('focus'))
    await settle()
    expect(errorAt(root, 'name')).toBe('Required')

    input.dispatchEvent(new Event('blur'))
    await settle()
    expect(errorAt(root, 'name')).toBeNull()
  })

  it("doesn't revalidate a step that hasn't failed Next", async () => {
    const { root, jsonForm } = mountSteps()
    await fillFirstStep(root, jsonForm)
    type(root, 'city', 'x')
    await settle()
    expect(errorAt(root, 'zip')).toBeNull()
    expect(getErrors(jsonForm.form, { path: ['lines'] } as never)).toBeNull()
  })

  it('revalidates when the items of an array change after a failed Next', async () => {
    const { root, jsonForm } = mountSteps()
    await fillFirstStep(root, jsonForm)
    type(root, 'city', 'Graz')
    await next(jsonForm)
    expect(root.textContent).toContain('Add a line')

    const { arrays } = await import('./components')
    arrays.get('lines')?.add()
    await settle()
    expect(root.textContent).not.toContain('Add a line')
    expect(errorAt(root, 'lines.0.product')).toBe('Required')
    arrays.get('lines')?.move(0, 0)
    arrays.get('lines')?.remove(0)
    await settle()
    expect(root.textContent).toContain('Add a line')
  })

  it('goes to a step: back freely, forward through each step on the way', async () => {
    const { root, jsonForm } = mountSteps()

    expect(await jsonForm.steps.goTo(2)).toBe(false)
    await settle()
    expect(stepOf(root)).toBe('You')

    await fillFirstStep(root, jsonForm)
    type(root, 'city', 'Graz')
    jsonForm.steps.back()
    await settle()
    // The step after is in the way, with no line yet: it stops there, with its issues shown.
    expect(await jsonForm.steps.goTo(2)).toBe(false)
    await settle()
    expect(stepOf(root)).toBe('Where')
    expect(root.textContent).toContain('Add a line')

    expect(await jsonForm.steps.goTo(0)).toBe(true)
    await expect(jsonForm.steps.goTo(3)).rejects.toThrow(RangeError)
    await expect(jsonForm.steps.goTo(-1)).rejects.toThrow('No step -1. The form has 3.')
  })

  it("doesn't go past the last step", async () => {
    const definition = json({
      fields: [{ name: 'a', type: 'text' }],
      layout: { steps: [{ items: ['a'] }] },
    })
    const { jsonForm } = mountSteps(definition)

    expect(jsonForm.steps.isLast).toBe(true)
    expect(await next(jsonForm)).toBe(false)
    jsonForm.steps.back()
    expect(jsonForm.steps.index).toBe(0)
  })

  it('treats a submit before the last step as Next', async () => {
    const { root, jsonForm, submitted } = mountSteps()

    requestSubmit(jsonForm.form)
    await settle()
    expect(stepOf(root)).toBe('You')
    expect(errorAt(root, 'name')).toBe('Required')
    expect(jsonForm.form.isSubmitted).toBe(false)

    type(root, 'email', 'ana@example.com')
    type(root, 'name', 'Ana')
    root
      .querySelector('form')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await settle()
    expect(stepOf(root)).toBe('Where')
    expect(submitted).toEqual([])
  })

  it('submits on the last step', async () => {
    const definition = json({ fields: fields.filter((field) => field.name !== 'lines') })
    const short = {
      ...definition,
      layout: { steps: [{ items: ['name', 'email'] }, { items: ['city', 'zip', 'code'] }] },
    }
    const { root, jsonForm, submitted } = mountSteps(short)
    await fillFirstStep(root, jsonForm)
    type(root, 'city', 'Graz')
    type(root, 'code', 'X')

    requestSubmit(jsonForm.form)
    await settle()
    expect(submitted).toEqual([{ email: 'ana@example.com', name: 'Ana', city: 'Graz', code: 'X' }])
  })

  it('moves on once the task that called Next is over', async () => {
    const short = {
      ...json({ fields: fields.filter((field) => field.name !== 'lines') }),
      layout: {
        steps: [
          { label: 'First', items: ['name', 'email'] },
          { label: 'Last', items: ['city', 'zip', 'code'] },
        ],
      },
    }
    const { root, jsonForm } = mountSteps(short)
    type(root, 'email', 'ana@example.com')
    type(root, 'name', 'Ana')

    // A click runs its default action after its handlers and their microtasks. A Next button that
    // turns into the submit button as the step changes in between would submit the form.
    let moved = false
    const moving = jsonForm.steps.next().then((result) => (moved = result))
    for (let i = 0; i < 50; i++) await Promise.resolve()
    expect([moved, jsonForm.steps.current.step.label]).toEqual([false, 'First'])

    await moving
    expect(moved).toBe(true)
    await settle()
    expect(stepOf(root)).toBe('Last')
    expect(errorAt(root, 'city')).toBeNull()
  })

  it('goes back to a step before when the submit fails because of it', async () => {
    const definition: JsonForm = {
      version: '1',
      fields: [
        { name: 'password', type: 'password', required: true },
        { name: 'repeat', type: 'password', required: true },
      ],
      formRules: [
        { rule: 'sameAs', field: 'password', other: 'repeat', message: 'Passwords differ' },
      ],
      layout: {
        steps: [
          { label: 'One', items: ['password'] },
          { label: 'Two', items: ['repeat'] },
        ],
      },
    }
    const { root, jsonForm, submitted } = mountSteps(definition)
    type(root, 'password', 'longenough1')
    expect(await next(jsonForm)).toBe(true)
    type(root, 'repeat', 'longenough2')

    requestSubmit(jsonForm.form)
    await settle()
    await settle()
    expect(submitted).toEqual([])
    expect(stepOf(root)).toBe('One')
    expect(errorAt(root, 'password')).toBe('Passwords differ')
    expect(document.activeElement).toBe(root.querySelector('[data-path="password"] input'))
  })

  it('stays on the last step when its own fields fail the submit', async () => {
    const short = {
      ...json({ fields: fields.filter((field) => field.name !== 'lines') }),
      layout: {
        steps: [
          { label: 'One', items: ['name', 'email'] },
          { label: 'Two', items: ['*'] },
        ],
      },
    }
    const { root, jsonForm, submitted } = mountSteps(short)
    await fillFirstStep(root, jsonForm)

    requestSubmit(jsonForm.form)
    await settle()
    await settle()
    expect(submitted).toEqual([])
    expect(stepOf(root)).toBe('Two')
    expect(errorAt(root, 'city')).toBe('Required')
  })

  it('keeps the errors the submit handler sets on a field of the last step', async () => {
    const { root, jsonForm } = mountSteps(
      json(),
      {},
      rejecting([['code'], 'This code is already used']),
    )
    await fillEveryStep(root, jsonForm)

    await submitAndSettle(jsonForm)
    expect(stepOf(root)).toBe('Code')
    expect(errorAt(root, 'code')).toBe('This code is already used')

    // The user's next edit validates the form again, as in a form without steps.
    type(root, 'code', 'NS-21001')
    await settle()
    expect(errorAt(root, 'code')).toBeNull()
  })

  it('goes back to the step of a field the submit handler sets errors on', async () => {
    const { root, jsonForm } = mountSteps(
      json(),
      {},
      rejecting(
        [['email'], 'This email is already registered'],
        [['code'], 'This code is already used'],
      ),
    )
    await fillEveryStep(root, jsonForm)

    await submitAndSettle(jsonForm)
    expect(stepOf(root)).toBe('You')
    expect([errorAt(root, 'name'), errorAt(root, 'email')]).toEqual([
      null,
      'This email is already registered',
    ])
    expect(document.activeElement).toBe(root.querySelector('[data-path="email"] input'))

    // The last step shows what it had when the form left it.
    expect(await next(jsonForm)).toBe(true)
    expect(await next(jsonForm)).toBe(true)
    expect(errorAt(root, 'code')).toBe('This code is already used')
  })

  it('focuses the first field with an element that the submit handler sets errors on', async () => {
    const { root, jsonForm } = mountSteps(
      json(),
      {},
      rejecting([['lines'], 'Two lines at least'], [['lines', 0, 'product'], 'Sold out']),
    )
    await fillEveryStep(root, jsonForm)

    await submitAndSettle(jsonForm)
    expect(stepOf(root)).toBe('Where')
    expect(root.textContent).toContain('Two lines at least')
    expect(errorAt(root, 'lines.0.product')).toBe('Sold out')
    expect(document.activeElement).toBe(root.querySelector('[data-path="lines.0.product"] input'))
  })

  it('keeps the error of a submit handler that throws', async () => {
    const { root, jsonForm } = mountSteps(json(), {}, () => {
      throw new Error('The server is down')
    })
    await fillEveryStep(root, jsonForm)

    await submitAndSettle(jsonForm)
    expect(stepOf(root)).toBe('Code')
    expect(getErrors(jsonForm.form)).toEqual(['The server is down'])
  })

  it('renders the step `step` names', () => {
    const jsonForm = withSetup(() =>
      useJsonForm(json(), { components: builtInComponents, layoutComponents }),
    )
    const root = mount(
      defineComponent({
        setup: () => () =>
          h(
            Form as Component,
            { of: jsonForm.form, onSubmit: () => {} },
            {
              default: () => h(JsonFields, { of: jsonForm, step: 2 }),
            },
          ),
      }),
    )
    expect(shown(root)).toEqual(['code'])
  })
})
