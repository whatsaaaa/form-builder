import { Form, getInput, setInput } from '@formisch/react'
import { affects } from '@whatsaaaa/form-builder-affects'
import { createSchemaBuilder, type JsonForm } from '@whatsaaaa/form-builder-schema'
import {
  JsonField,
  JsonFields,
  type JsonFormInstance,
  useJsonForm,
} from '@whatsaaaa/form-builder-react'
import { act, type ReactNode, useEffect } from 'react'
import { describe, expect, it } from 'vitest'
import business from '../../../fixtures/affects/business.json'
import order from '../../../fixtures/affects/order.json'
import shipping from '../../../fixtures/affects/shipping.json'
import signUp from '../../../fixtures/affects/sign-up.json'
import { builtInComponents, layoutComponents, values } from './components'
import { form, mount, submit, type, update } from './helpers'

const builder = createSchemaBuilder({ extensions: [affects()] })

/**
 * Mounts what `content` renders in Formisch's `<Form>`, with the builder that knows affects.
 * `current()` gives what `useJsonForm` returned on the last render, and `renders()` how many
 * times the form rendered.
 */
function mountAffects(
  json: unknown,
  content: (jsonForm: JsonFormInstance) => ReactNode = (jsonForm) => <JsonFields of={jsonForm} />,
) {
  const submitted: unknown[] = []
  const latest: { current?: JsonFormInstance; renders: number } = { renders: 0 }
  function App() {
    const jsonForm = useJsonForm(json as JsonForm, {
      builder,
      components: builtInComponents,
      layoutComponents,
    })
    latest.renders++
    useEffect(() => {
      latest.current = jsonForm
    })
    return (
      <Form of={jsonForm.form} onSubmit={(output) => void submitted.push(output)}>
        {content(jsonForm)}
      </Form>
    )
  }
  const root = mount(<App />)
  return {
    root,
    submitted,
    current: () => latest.current as JsonFormInstance,
    renders: () => latest.renders,
  }
}

/** The paths of the value fields on show, in order. */
const shown = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[data-role="value"]')].map(
    (element) => element.dataset['path'],
  )

/** Sets a field's input the way its component does, and waits for React. */
const set = (path: string, input: unknown) => update(() => values.get(path)?.setInput(input))

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

describe('a field with affects', () => {
  it('renders only while it is shown', async () => {
    const { root } = mountAffects(business)
    expect(shown(root)).toEqual(['accountType', 'fullName'])

    await set('accountType', 'business')
    expect(shown(root)).toEqual([
      'accountType',
      'fullName',
      'company.name',
      'company.vatId',
      'company.size',
    ])
    await set('company.size', 'large')
    expect(shown(root)).toContain('employees')
    await set('accountType', 'personal')
    expect(shown(root)).toEqual(['accountType', 'fullName'])
  })

  it("doesn't keep the form from submitting while it is hidden", async () => {
    const { root, submitted } = mountAffects(business)
    await set('accountType', 'personal')
    await set('fullName', 'Ana')
    await submit(root)

    expect(submitted).toEqual([
      {
        accountType: 'personal',
        fullName: 'Ana',
        company: { name: undefined, vatId: undefined, size: undefined },
        employees: undefined,
      },
    ])
  })

  it('renders the form again only when what is hidden changes', async () => {
    const { root, renders } = mountAffects(business)
    await set('accountType', 'business')
    const before = renders()
    type(root, 'fullName', 'Ana')
    type(root, 'company.name', 'Acme')
    await update(() => {})
    expect(renders()).toBe(before)
    await set('company.size', 'medium')
    expect(renders()).toBeGreaterThan(before)
  })

  it('is exposed for your own renderers', async () => {
    const { current } = mountAffects(business)
    const company = current().fields[2]
    expect(current().visibility.isHidden(company as never, [])).toBe(true)
    await set('accountType', 'business')
    expect(current().visibility.isHidden(company as never, [])).toBe(false)
  })
})

describe('hideAndClear', () => {
  it('starts a field hidden without its default', () => {
    const { root, current } = mountAffects(shipping)
    expect(shown(root)).toEqual(['billing.street', 'billing.zip', 'billing.city', 'sameAsBilling'])
    expect(getInput(current().form)).toMatchObject({ shipping: { country: undefined } })
  })

  it('clears the fields it hides, wherever they are rendered', async () => {
    const { root, current } = mountAffects(shipping)
    await set('sameAsBilling', false)
    expect(shown(root)).toContain('shipping.country')
    await set('shipping.zip', '8010')
    await set('shipping.country', 'AT')
    expect(shown(root)).toContain('confirmZip')

    await set('sameAsBilling', true)
    expect(getInput(current().form)).toMatchObject({
      shipping: { street: undefined, zip: undefined, city: undefined, country: undefined },
    })
    expect(shown(root)).not.toContain('confirmZip')
  })

  it('clears the fields of each item of a list by its own fields', async () => {
    const { root, current } = mountAffects(order)
    await update(() =>
      setInput(current().form, {
        path: ['lines'],
        input: [{ kind: 'product', sku: 'P-1', quantity: 2 }],
      } as never),
    )
    expect(shown(root)).toEqual(['isGift', 'lines.0.kind', 'lines.0.sku', 'lines.0.quantity'])

    await set('lines.0.kind', 'service')
    expect(shown(root)).toEqual(['isGift', 'lines.0.kind', 'lines.0.quantity', 'lines.0.hours'])
    expect(getInput(current().form)).toMatchObject({ lines: [{ kind: 'service', sku: undefined }] })
  })
})

describe('steps with affects', () => {
  function mountSteps() {
    const mounted = mountAffects(signUp, (jsonForm) => (
      <>
        <p data-step="">{jsonForm.steps.current.step.id}</p>
        <JsonFields of={jsonForm} />
      </>
    ))
    const ids = () => mounted.current().steps.list.map((step) => step.step.id)
    return { ...mounted, ids }
  }

  it('leave out a step whose fields are all hidden, and skip it', async () => {
    const { root, current, ids } = mountSteps()
    expect(ids()).toEqual(['account', 'confirm'])

    await set('email', 'ana@example.com')
    await set('accountType', 'personal')
    expect(await run(current, (steps) => steps.next())).toBe(true)
    expect(current().steps.current.step.id).toBe('confirm')
    expect([current().steps.index, current().steps.isLast]).toEqual([1, true])
    expect(shown(root)).toEqual(['newsletter', 'acceptTerms'])

    await run(current, (steps) => steps.back())
    expect(current().steps.current.step.id).toBe('account')
  })

  it('show a step once a field in it shows', async () => {
    const { root, current, ids } = mountSteps()
    await set('email', 'ana@example.com')
    await set('accountType', 'business')
    expect(ids()).toEqual(['account', 'company', 'confirm'])

    expect(await run(current, (steps) => steps.next())).toBe(true)
    expect(shown(root)).toEqual(['company.name', 'company.vatId'])
    expect(await run(current, (steps) => steps.next())).toBe(false)
  })

  it('keep the current step on show, even when it hides', async () => {
    const { current, ids } = mountSteps()
    await set('email', 'ana@example.com')
    await set('accountType', 'business')
    await run(current, (steps) => steps.next())

    await update(() =>
      setInput(current().form, { path: ['accountType'], input: 'personal' } as never),
    )
    expect(ids()).toEqual(['account', 'company', 'confirm'])
    expect(current().steps.current.step.id).toBe('company')

    await run(current, (steps) => steps.back())
    expect(ids()).toEqual(['account', 'confirm'])
  })

  it('go to a step by its index among the steps on show', async () => {
    const { current } = mountSteps()
    await set('email', 'ana@example.com')
    await set('accountType', 'personal')
    expect(await run(current, (steps) => steps.goTo(1))).toBe(true)
    expect(current().steps.current.step.id).toBe('confirm')
    await expect(current().steps.goTo(2)).rejects.toThrow(
      new RangeError('No step 2. The form has 2.'),
    )
  })

  it('submit what is shown, from the last step on show', async () => {
    const { root, current, submitted } = mountSteps()
    await set('email', 'ana@example.com')
    await set('accountType', 'personal')
    await run(current, (steps) => steps.next())
    await set('newsletter', true)
    expect(shown(root)).toEqual(['newsletter', 'topics', 'acceptTerms'])
    await set('newsletter', false)
    await set('acceptTerms', true)
    await submit(root)

    expect(submitted).toEqual([
      {
        email: 'ana@example.com',
        accountType: 'personal',
        company: { name: undefined, vatId: undefined },
        newsletter: false,
        topics: undefined,
        otherTopic: undefined,
        acceptTerms: true,
      },
    ])
  })
})

describe('<JsonField> with affects', () => {
  it('renders nothing while its field is hidden', async () => {
    const { root } = mountAffects(business, (jsonForm) => (
      <>
        <JsonField of={jsonForm} path="accountType" />
        <JsonField of={jsonForm} path="company" />
      </>
    ))
    expect(shown(root)).toEqual(['accountType'])
    await set('accountType', 'business')
    expect(shown(root)).toEqual(['accountType', 'company.name', 'company.vatId', 'company.size'])
  })
})

describe('a form without conditions', () => {
  it('hides nothing, whatever the input', async () => {
    const { current } = mountAffects(form({ name: 'a', type: 'text' }))
    const before = current().visibility
    await update(() => setInput(current().form, { path: ['a'], input: 'x' } as never))
    expect(current().visibility).toBe(before)
    expect(before.toClear).toEqual([])
  })
})
