import { Form, getInput, setInput } from '@formisch/vue'
import { affects } from '@whatsaaaa/form-builder-affects'
import { createSchemaBuilder, type JsonForm } from '@whatsaaaa/form-builder-schema'
import {
  JsonField,
  JsonFields,
  type JsonFormInstance,
  useJsonForm,
} from '@whatsaaaa/form-builder-vue'
import { type Component, defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import business from '../../../fixtures/affects/business.json'
import order from '../../../fixtures/affects/order.json'
import shipping from '../../../fixtures/affects/shipping.json'
import signUp from '../../../fixtures/affects/sign-up.json'
import { builtInComponents, layoutComponents, values } from './components'
import { form, mount, settle, submit, withSetup } from './helpers'

const builder = createSchemaBuilder({ extensions: [affects()] })

/** Mounts `<JsonFields>` in Formisch's `<Form>`, with the builder that knows affects. */
function mountAffects(json: unknown) {
  const submitted: unknown[] = []
  const jsonForm = withSetup(() =>
    useJsonForm(json as JsonForm, { builder, components: builtInComponents, layoutComponents }),
  )
  const root = mount(
    defineComponent({
      setup: () => () =>
        h(
          Form as Component,
          { of: jsonForm.form, onSubmit: (output: unknown) => submitted.push(output) },
          { default: () => h(JsonFields, { of: jsonForm }) },
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

/** Sets a field's input the way its component does, and waits for Vue. */
async function set(path: string, input: unknown) {
  values.get(path)?.setInput(input)
  await settle()
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
    expect(root.querySelector('[data-path="company"] [data-role="display"]')?.textContent).toBe(
      'Company',
    )

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

  it('is exposed for your own renderers', async () => {
    const { jsonForm } = mountAffects(business)
    const [, , company] = jsonForm.fields
    expect(jsonForm.visibility.isHidden(company as never, [])).toBe(true)
    await set('accountType', 'business')
    expect(jsonForm.visibility.isHidden(company as never, [])).toBe(false)
  })
})

describe('hideAndClear', () => {
  it('starts a field hidden without its default', () => {
    const { root, jsonForm } = mountAffects(shipping)
    expect(shown(root)).toEqual(['billing.street', 'billing.zip', 'billing.city', 'sameAsBilling'])
    expect(getInput(jsonForm.form)).toMatchObject({ shipping: { country: undefined } })
  })

  it('clears the fields it hides, wherever they are rendered', async () => {
    const { root, jsonForm } = mountAffects(shipping)
    await set('sameAsBilling', false)
    expect(shown(root)).toEqual([
      'billing.street',
      'billing.zip',
      'billing.city',
      'sameAsBilling',
      'shipping.street',
      'shipping.zip',
      'shipping.city',
      'shipping.country',
    ])
    await set('shipping.zip', '8010')
    await set('shipping.country', 'AT')
    expect(shown(root)).toContain('confirmZip')

    await set('sameAsBilling', true)
    expect(getInput(jsonForm.form)).toMatchObject({
      shipping: { street: undefined, zip: undefined, city: undefined, country: undefined },
    })
    expect(shown(root)).not.toContain('confirmZip')
  })

  it('clears the fields of each item of a list by its own fields', async () => {
    const { root, jsonForm } = mountAffects(order)
    setInput(jsonForm.form, {
      path: ['lines'],
      input: [{ kind: 'product', sku: 'P-1', quantity: 2 }],
    } as never)
    await settle()
    expect(shown(root)).toEqual(['isGift', 'lines.0.kind', 'lines.0.sku', 'lines.0.quantity'])

    await set('lines.0.kind', 'service')
    expect(shown(root)).toEqual(['isGift', 'lines.0.kind', 'lines.0.quantity', 'lines.0.hours'])
    expect(getInput(jsonForm.form)).toMatchObject({ lines: [{ kind: 'service', sku: undefined }] })
  })
})

describe('steps with affects', () => {
  function mountSteps() {
    const mounted = mountAffects(signUp)
    const ids = () => mounted.jsonForm.steps.list.map((step) => step.step.id)
    return { ...mounted, ids }
  }

  it('leave out a step whose fields are all hidden, and skip it', async () => {
    const { root, jsonForm, ids } = mountSteps()
    expect(ids()).toEqual(['account', 'confirm'])

    await set('email', 'ana@example.com')
    await set('accountType', 'personal')
    expect(await jsonForm.steps.next()).toBe(true)
    await settle()
    expect(jsonForm.steps.current.step.id).toBe('confirm')
    expect([jsonForm.steps.index, jsonForm.steps.isLast]).toEqual([1, true])
    expect(shown(root)).toEqual(['newsletter', 'acceptTerms'])

    jsonForm.steps.back()
    await settle()
    expect(jsonForm.steps.current.step.id).toBe('account')
  })

  it('show a step once a field in it shows', async () => {
    const { root, jsonForm, ids } = mountSteps()
    await set('email', 'ana@example.com')
    await set('accountType', 'business')
    expect(ids()).toEqual(['account', 'company', 'confirm'])

    expect(await jsonForm.steps.next()).toBe(true)
    await settle()
    expect(shown(root)).toEqual(['company.name', 'company.vatId'])
    expect(await jsonForm.steps.next()).toBe(false)
  })

  it('keep the current step on show, even when it hides', async () => {
    const { jsonForm, ids } = mountSteps()
    await set('email', 'ana@example.com')
    await set('accountType', 'business')
    await jsonForm.steps.next()
    await settle()

    setInput(jsonForm.form, { path: ['accountType'], input: 'personal' } as never)
    await settle()
    expect(ids()).toEqual(['account', 'company', 'confirm'])
    expect(jsonForm.steps.current.step.id).toBe('company')

    jsonForm.steps.back()
    await settle()
    expect(ids()).toEqual(['account', 'confirm'])
  })

  it('go to a step by its index among the steps on show', async () => {
    const { jsonForm } = mountSteps()
    await set('email', 'ana@example.com')
    await set('accountType', 'personal')
    expect(await jsonForm.steps.goTo(1)).toBe(true)
    expect(jsonForm.steps.current.step.id).toBe('confirm')
    await expect(jsonForm.steps.goTo(2)).rejects.toThrow(
      new RangeError('No step 2. The form has 2.'),
    )
  })

  it('show a section only while its conditions do', async () => {
    const { root, jsonForm } = mountSteps()
    await set('email', 'ana@example.com')
    await set('accountType', 'personal')
    await jsonForm.steps.next()
    await settle()

    await set('newsletter', true)
    expect(shown(root)).toEqual(['newsletter', 'topics', 'acceptTerms'])
    expect(root.querySelector('[data-section="topics"] legend')?.textContent).toBe('Your topics')
    await set('topics', ['other'])
    expect(shown(root)).toEqual(['newsletter', 'topics', 'otherTopic', 'acceptTerms'])
  })

  it('submit what is shown, and what a plain hide keeps', async () => {
    const { root, jsonForm, submitted } = mountSteps()
    await set('email', 'ana@example.com')
    await set('accountType', 'personal')
    await jsonForm.steps.next()
    await settle()
    await set('acceptTerms', true)
    await submit(root)

    expect(submitted).toEqual([
      {
        email: 'ana@example.com',
        accountType: 'personal',
        company: { name: undefined, vatId: undefined },
        newsletter: undefined,
        topics: undefined,
        otherTopic: undefined,
        acceptTerms: true,
      },
    ])
  })
})

describe('<JsonField> with affects', () => {
  it('renders nothing while its field is hidden', async () => {
    const jsonForm = withSetup(() =>
      useJsonForm(business as unknown as JsonForm, { builder, components: builtInComponents }),
    )
    const root = mount(
      defineComponent({
        setup: () => () =>
          h(
            Form as Component,
            { of: jsonForm.form },
            {
              default: () => [
                h(JsonField, { of: jsonForm, path: 'accountType' }),
                h(JsonField, { of: jsonForm, path: 'company' }),
              ],
            },
          ),
      }),
    )
    expect(shown(root)).toEqual(['accountType'])
    await set('accountType', 'business')
    expect(shown(root)).toEqual(['accountType', 'company.name', 'company.vatId', 'company.size'])
  })
})

describe('a form without conditions', () => {
  it('hides nothing, whatever the input', async () => {
    const jsonForm = withSetup(() =>
      useJsonForm(form({ name: 'a', type: 'text' }), { builder, components: builtInComponents }),
    )
    const before = jsonForm.visibility
    setInput(jsonForm.form, { path: ['a'], input: 'x' } as never)
    await settle()
    expect(jsonForm.visibility).toBe(before)
    expect(before.toClear).toEqual([])
  })
})
