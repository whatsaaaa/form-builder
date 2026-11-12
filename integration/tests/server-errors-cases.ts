import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { expect, it } from 'vitest'
import { fixtures } from './fixtures'
import { controlAt, expectEnd, perform, type RenderedForm } from './run-scenarios'
import { add, type DotPath, fill, next, type Scenario, submit } from './scenarios'

/** One issue of a server's answer to a submit: a message, and the Formisch path of its field. */
export interface ServerIssue {
  path: (string | number)[]
  message: string
}

/** A password and its repeat on two steps, with a rule that reads both. */
const passwords: JsonForm = {
  version: '1',
  fields: [
    { name: 'password', type: 'password', required: true },
    { name: 'repeat', type: 'password', required: true },
  ],
  formRules: [{ rule: 'sameAs', field: 'password', other: 'repeat', message: 'Passwords differ' }],
  layout: { steps: [{ items: ['password'] }, { items: ['repeat'] }] },
}

/**
 * A form with steps whose server answers every submit with `rejects`, the way an app shows them:
 * each message on its field, with Formisch's `setErrors`. Without any, the server takes the input.
 */
interface ServerErrorsCase extends Omit<Scenario, 'fixture'> {
  json: JsonForm
  rejects: ServerIssue[]
  /** The field that has the focus at the end. */
  focus: DotPath
}

/** Every step of the order fixture, filled with what its schema takes, and submitted. */
const order = [
  fill('customer', 'Milica Jovanović'),
  next,
  add('lines'),
  fill('lines.0.product', 'Olovka'),
  fill('lines.0.quantity', '9'),
  next,
  fill('deliverBy', '2026-12-01'),
  submit,
]

const noDelivery: ServerIssue = { path: ['deliverBy'], message: 'No delivery on that day' }

const cases: ServerErrorsCase[] = [
  {
    name: 'shows a message on a field of the last step',
    json: fixtures['layout/order'],
    steps: order,
    rejects: [noDelivery],
    shown: ['deliverBy', 'note'],
    errors: { deliverBy: 'No delivery on that day' },
    focus: 'deliverBy',
  },
  {
    name: 'goes back to the step of a field with a message, and shows it there',
    json: fixtures['layout/order'],
    steps: order,
    rejects: [{ path: ['customer'], message: 'Unknown customer' }, noDelivery],
    shown: ['customer'],
    errors: { customer: 'Unknown customer' },
    focus: 'customer',
  },
  {
    name: 'goes back to the step of a list whose item has a message',
    json: fixtures['layout/order'],
    steps: order,
    rejects: [{ path: ['lines', 0, 'quantity'], message: 'Only 5 in stock' }],
    shown: ['lines.0.product', 'lines.0.quantity'],
    errors: { 'lines.0.quantity': 'Only 5 in stock' },
    focus: 'lines.0.quantity',
  },
  {
    name: 'validates again on the next edit, which clears the message',
    json: fixtures['layout/order'],
    steps: [...order, fill('deliverBy', '2026-12-02')],
    rejects: [noDelivery],
    shown: ['deliverBy', 'note'],
    focus: 'deliverBy',
  },
  {
    name: 'goes back to the step a form rule fails on, as before',
    json: passwords,
    steps: [fill('password', 'tajna lozinka'), next, fill('repeat', 'druga lozinka'), submit],
    rejects: [],
    shown: ['password'],
    errors: { password: 'Passwords differ' },
    focus: 'password',
  },
]

/**
 * Runs every case on forms from `render`, whose submit handler shows `rejects` when there are any,
 * and else keeps the output as submitted.
 */
export function runServerErrorsCases(
  render: (json: JsonForm, rejects: readonly ServerIssue[]) => RenderedForm,
) {
  it.each(cases)('$name', async ({ json, rejects, focus, ...scenario }) => {
    const form = render(json, rejects)
    for (const step of scenario.steps) {
      await form.update(() => perform(form.root, step))
      // The server answers after the submit is on its way, and the steps go where they go after.
      if (step.do === 'submit') for (let i = 0; i < 3; i++) await form.update(() => {})
    }

    expectEnd(form, scenario)
    expect(document.activeElement).toBe(controlAt(form.root, focus))
  })
}
