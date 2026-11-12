import {
  Form,
  type FormStore,
  getErrors,
  setErrors,
  submit as requestSubmit,
} from '@formisch/react'
import type { JsonForm, JsonLayout } from '@whatsaaaa/form-builder-schema'
import {
  JsonFields,
  type JsonFormInstance,
  useJsonForm,
  type UseJsonFormOptions,
  type ValueFieldProps,
} from '@whatsaaaa/form-builder-react'
import { act, useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import { arrays, builtInComponents, layoutComponents, values } from './components'
import { errorAt, mount, settle, type, update } from './helpers'

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
 * Mounts the form with `<JsonFields>` for the current step, the way an app uses steps. `current()`
 * gives what `useJsonForm` returned on the last render. Without an `onSubmit` of the app's own, the
 * outputs it submits are in `submitted`.
 */
function mountSteps(
  definition: JsonForm = json(),
  options: UseJsonFormOptions = {},
  onSubmit?: (form: FormStore) => unknown,
) {
  const submitted: unknown[] = []
  const latest: { current?: JsonFormInstance } = {}
  function App() {
    const jsonForm = useJsonForm(definition, {
      components: builtInComponents,
      layoutComponents,
      ...options,
    })
    useEffect(() => {
      latest.current = jsonForm
    })
    return (
      <Form
        of={jsonForm.form}
        onSubmit={(output) => (onSubmit ? onSubmit(jsonForm.form) : void submitted.push(output))}
      >
        <p data-step="">{jsonForm.steps.current.step.label}</p>
        <JsonFields of={jsonForm} />
      </Form>
    )
  }
  const root = mount(<App />)
  return { root, current: () => latest.current as JsonFormInstance, submitted }
}

/** The paths of the value fields on show, in order. */
const shown = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[data-role="value"]')].map(
    (element) => element.dataset['path'],
  )

const stepOf = (root: HTMLElement) => root.querySelector('[data-step]')?.textContent

/** Runs `step` on the latest steps, and waits until it has rendered. */
async function run<T>(
  current: () => JsonFormInstance,
  step: (steps: JsonFormInstance['steps']) => Promise<T> | T,
) {
  let result: T | undefined
  await act(async () => {
    result = await step(current().steps)
    await new Promise((resolve) => setTimeout(resolve))
  })
  return result as T
}

async function fillFirstStep(root: HTMLElement, current: () => JsonFormInstance) {
  type(root, 'email', 'ana@example.com')
  type(root, 'name', 'Ana')
  expect(await run(current, (steps) => steps.next())).toBe(true)
}

/** Fills every step with what the schema takes, up to the last one. */
async function fillEveryStep(root: HTMLElement, current: () => JsonFormInstance) {
  type(root, 'email', 'milica@example.com')
  type(root, 'name', 'Milica')
  expect(await run(current, (steps) => steps.next())).toBe(true)
  type(root, 'city', 'Beograd')
  await update(() => arrays.get('lines')?.add())
  type(root, 'lines.0.product', 'Olovka')
  expect(await run(current, (steps) => steps.next())).toBe(true)
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
async function submitAndSettle(current: () => JsonFormInstance) {
  await update(() => requestSubmit(current().form))
  for (let i = 0; i < 3; i++) await settle()
}

describe('steps', () => {
  it('renders the first step, and knows where it is', () => {
    const { root, current } = mountSteps()
    const { steps } = current()

    expect(shown(root)).toEqual(['name', 'email'])
    expect(steps.list.map((step) => step.step.id)).toEqual(['you', 'where', 'code'])
    expect([steps.index, steps.isFirst, steps.isLast]).toEqual([0, true, false])
    expect(steps.current).toBe(steps.list[0])
  })

  it('stays on a step with issues, shows them, and focuses the first in layout order', async () => {
    const { root, current } = mountSteps()

    expect(await run(current, (steps) => steps.next())).toBe(false)
    expect(stepOf(root)).toBe('You')
    expect([errorAt(root, 'name'), errorAt(root, 'email')]).toEqual(['Required', 'Required'])
    expect(document.activeElement).toBe(root.querySelector('[data-path="name"] input'))
  })

  it('moves on when the step has no issues, and the next step starts clean', async () => {
    const { root, current } = mountSteps()
    await fillFirstStep(root, current)

    expect(stepOf(root)).toBe('Where')
    expect(shown(root)).toEqual(['city', 'zip'])
    expect(current().steps).toMatchObject({ index: 1, isFirst: false, isLast: false })
    expect(errorAt(root, 'city')).toBeNull()
    expect(getErrors(current().form, { path: ['lines'] } as never)).toBeNull()
    expect(getErrors(current().form, { path: ['code'] } as never)).toEqual(['Required'])
  })

  it('goes back without validating, and keeps what each step holds', async () => {
    const { root, current } = mountSteps()
    await fillFirstStep(root, current)
    expect(await run(current, (steps) => steps.next())).toBe(false)
    expect(errorAt(root, 'city')).toBe('Required')

    await run(current, (steps) => steps.back())
    expect(stepOf(root)).toBe('You')
    expect((root.querySelector('[data-path="name"] input') as HTMLInputElement).value).toBe('Ana')

    expect(await run(current, (steps) => steps.next())).toBe(true)
    // It was seen, so it keeps its errors.
    expect(errorAt(root, 'city')).toBe('Required')
    await run(current, (steps) => steps.back())
    await run(current, (steps) => steps.back())
    expect(current().steps.index).toBe(0)
  })

  it('shows a step as the user left it, not with the errors of validating the one before', async () => {
    const { root, current } = mountSteps()
    await fillFirstStep(root, current)
    type(root, 'zip', '1010')
    await run(current, (steps) => steps.back())

    expect(await run(current, (steps) => steps.next())).toBe(true)
    expect(errorAt(root, 'city')).toBeNull()
    expect((root.querySelector('[data-path="zip"] input') as HTMLInputElement).value).toBe('1010')
  })

  it('revalidates a step that failed Next as the user fixes it', async () => {
    const { root, current } = mountSteps()
    await run(current, (steps) => steps.next())

    type(root, 'name', 'Ana')
    await settle()
    expect(errorAt(root, 'name')).toBeNull()
    expect(errorAt(root, 'email')).toBe('Required')
  })

  it('revalidates a step that failed Next when the user comes back to it', async () => {
    const { root, current } = mountSteps()
    await fillFirstStep(root, current)
    expect(await run(current, (steps) => steps.next())).toBe(false)
    await run(current, (steps) => steps.back())
    expect(await run(current, (steps) => steps.next())).toBe(true)
    expect(errorAt(root, 'city')).toBe('Required')

    type(root, 'city', 'Graz')
    await settle()
    expect(errorAt(root, 'city')).toBeNull()
  })

  it('revalidates on the event `revalidate` names', async () => {
    const { root, current } = mountSteps(json(), { revalidate: 'blur' })
    await run(current, (steps) => steps.next())
    const input = () => root.querySelector('[data-path="name"] input') as HTMLInputElement

    type(root, 'name', 'Ana')
    await update(() => {
      input().dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    })
    expect(errorAt(root, 'name')).toBe('Required')

    await update(() => {
      input().dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(errorAt(root, 'name')).toBeNull()
  })

  it("revalidates on the element's change event with revalidate: 'change'", async () => {
    const { root, current } = mountSteps(json(), { revalidate: 'change' })
    await run(current, (steps) => steps.next())

    type(root, 'name', 'Ana')
    await settle()
    expect(errorAt(root, 'name')).toBe('Required')

    const input = root.querySelector('[data-path="name"] input') as HTMLInputElement
    await update(() =>
      values.get('name')?.inputProps.onChange({ target: input, currentTarget: input } as never),
    )
    expect(errorAt(root, 'name')).toBeNull()
  })

  it("revalidates as the user types into an input with Formisch's own onChange", async () => {
    function PropsInput(props: ValueFieldProps) {
      return (
        <div data-role="value" data-path={props.path.join('.')}>
          <input {...props.inputProps} />
          {props.errors && <small>{props.errors[0]}</small>}
        </div>
      )
    }
    const { root, current } = mountSteps(json(), {
      components: { ...builtInComponents, text: PropsInput },
    })
    await run(current, (steps) => steps.next())
    expect(errorAt(root, 'name')).toBe('Required')

    type(root, 'name', 'Ana')
    await settle()
    expect(errorAt(root, 'name')).toBeNull()
    expect(errorAt(root, 'email')).toBe('Required')
  })

  it('revalidates when the items of an array change after a failed Next', async () => {
    const { root, current } = mountSteps()
    await fillFirstStep(root, current)
    type(root, 'city', 'Graz')
    await run(current, (steps) => steps.next())
    expect(root.textContent).toContain('Add a line')

    await update(() => arrays.get('lines')?.add())
    expect(root.textContent).not.toContain('Add a line')
    expect(errorAt(root, 'lines.0.product')).toBe('Required')
    await update(() => arrays.get('lines')?.move(0, 0))
    await update(() => arrays.get('lines')?.remove(0))
    expect(root.textContent).toContain('Add a line')
  })

  it('goes to a step: back freely, forward through each step on the way', async () => {
    const { root, current } = mountSteps()

    expect(await run(current, (steps) => steps.goTo(2))).toBe(false)
    expect(stepOf(root)).toBe('You')

    await fillFirstStep(root, current)
    type(root, 'city', 'Graz')
    await run(current, (steps) => steps.back())
    // The step after is in the way, with no line yet: it stops there, with its issues shown.
    expect(await run(current, (steps) => steps.goTo(2))).toBe(false)
    expect(stepOf(root)).toBe('Where')
    expect(root.textContent).toContain('Add a line')

    expect(await run(current, (steps) => steps.goTo(0))).toBe(true)
    await expect(current().steps.goTo(3)).rejects.toThrow('No step 3. The form has 3.')
  })

  it("doesn't go past the last step", async () => {
    const definition = json({
      fields: [{ name: 'a', type: 'text' }],
      layout: { steps: [{ items: ['a'] }] },
    })
    const { current } = mountSteps(definition)

    expect(current().steps.isLast).toBe(true)
    expect(await run(current, (steps) => steps.next())).toBe(false)
    await run(current, (steps) => steps.back())
    expect(current().steps.index).toBe(0)
  })

  it('treats a submit before the last step as Next', async () => {
    const { root, current, submitted } = mountSteps()

    await update(() => requestSubmit(current().form))
    expect(stepOf(root)).toBe('You')
    expect(errorAt(root, 'name')).toBe('Required')
    expect(current().form.isSubmitted).toBe(false)

    type(root, 'email', 'ana@example.com')
    type(root, 'name', 'Ana')
    await update(() => {
      root
        .querySelector('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(stepOf(root)).toBe('Where')
    expect(submitted).toEqual([])
  })

  it('submits on the last step, and stays there when its own fields fail', async () => {
    const short = {
      ...json({ fields: fields.filter((field) => field.name !== 'lines') }),
      layout: {
        steps: [
          { label: 'One', items: ['name', 'email'] },
          { label: 'Two', items: ['*'] },
        ],
      },
    }
    const { root, current, submitted } = mountSteps(short)
    await fillFirstStep(root, current)

    await update(() => requestSubmit(current().form))
    await settle()
    expect(submitted).toEqual([])
    expect(stepOf(root)).toBe('Two')
    expect(errorAt(root, 'city')).toBe('Required')

    type(root, 'city', 'Graz')
    type(root, 'code', 'X')
    await update(() => requestSubmit(current().form))
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
    const { root, current } = mountSteps(short)
    type(root, 'email', 'ana@example.com')
    type(root, 'name', 'Ana')

    // A click runs its default action after its handlers and their microtasks. A Next button that
    // turns into the submit button as the step changes in between would submit the form.
    await act(async () => {
      let moved = false
      const moving = current()
        .steps.next()
        .then((result) => (moved = result))
      for (let i = 0; i < 50; i++) await Promise.resolve()
      expect(moved).toBe(false)
      await moving
      expect(moved).toBe(true)
    })
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
    const { root, current, submitted } = mountSteps(definition)
    type(root, 'password', 'longenough1')
    expect(await run(current, (steps) => steps.next())).toBe(true)
    type(root, 'repeat', 'longenough2')

    await update(() => requestSubmit(current().form))
    await settle()
    expect(submitted).toEqual([])
    expect(stepOf(root)).toBe('One')
    expect(errorAt(root, 'password')).toBe('Passwords differ')
    expect(document.activeElement).toBe(root.querySelector('[data-path="password"] input'))
  })

  it('keeps the errors the submit handler sets on a field of the last step', async () => {
    const { root, current } = mountSteps(
      json(),
      {},
      rejecting([['code'], 'This code is already used']),
    )
    await fillEveryStep(root, current)

    await submitAndSettle(current)
    expect(stepOf(root)).toBe('Code')
    expect(errorAt(root, 'code')).toBe('This code is already used')

    // The user's next edit validates the form again, as in a form without steps.
    type(root, 'code', 'NS-21001')
    await settle()
    expect(errorAt(root, 'code')).toBeNull()
  })

  it('goes back to the step of a field the submit handler sets errors on', async () => {
    const { root, current } = mountSteps(
      json(),
      {},
      rejecting(
        [['email'], 'This email is already registered'],
        [['code'], 'This code is already used'],
      ),
    )
    await fillEveryStep(root, current)

    await submitAndSettle(current)
    expect(stepOf(root)).toBe('You')
    expect([errorAt(root, 'name'), errorAt(root, 'email')]).toEqual([
      null,
      'This email is already registered',
    ])
    expect(document.activeElement).toBe(root.querySelector('[data-path="email"] input'))

    // The last step shows what it had when the form left it.
    expect(await run(current, (steps) => steps.next())).toBe(true)
    expect(await run(current, (steps) => steps.next())).toBe(true)
    expect(errorAt(root, 'code')).toBe('This code is already used')
  })

  it('focuses the first field with an element that the submit handler sets errors on', async () => {
    const { root, current } = mountSteps(
      json(),
      {},
      rejecting([['lines'], 'Two lines at least'], [['lines', 0, 'product'], 'Sold out']),
    )
    await fillEveryStep(root, current)

    await submitAndSettle(current)
    expect(stepOf(root)).toBe('Where')
    expect(root.textContent).toContain('Two lines at least')
    expect(errorAt(root, 'lines.0.product')).toBe('Sold out')
    expect(document.activeElement).toBe(root.querySelector('[data-path="lines.0.product"] input'))
  })

  it('keeps the error of a submit handler that throws', async () => {
    const { root, current } = mountSteps(json(), {}, () => {
      throw new Error('The server is down')
    })
    await fillEveryStep(root, current)

    await submitAndSettle(current)
    expect(stepOf(root)).toBe('Code')
    expect(getErrors(current().form)).toEqual(['The server is down'])
  })
})
