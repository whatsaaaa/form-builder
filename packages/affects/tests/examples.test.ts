import { type FieldNode, findField, type JsonForm } from '@whatsaaaa/form-builder-schema'
import { describe, expect, it } from 'vitest'
import { builder, fixtures, issuesOf, outputOf } from './helpers'

/** The dot path, or type, of each field the state hides, at the items of `indexes`. */
function hidden(json: JsonForm, input: unknown, indexes: readonly number[] = []): string[] {
  const state = builder.getVisibility(json).of(input)
  const found: string[] = []
  const visit = (nodes: readonly FieldNode[], depth: number) => {
    for (const node of nodes) {
      // Only the fields of the items `indexes` are in, and no deeper.
      if (node.dataPath.filter((key) => key === '*').length > indexes.length) continue
      const name = node.role === 'display' ? node.type : node.dataPath.join('.')
      if (state.isHidden(node, indexes)) found.push(name)
      visit(node.children, depth + 1)
    }
  }
  visit(builder.getFieldTree(json), 0)
  return found
}

describe('a business account', () => {
  const json = fixtures.business
  const input = (accountType: string, company: object, employees: unknown) => ({
    accountType,
    fullName: 'Ana',
    company: { name: undefined, vatId: undefined, size: undefined, ...company },
    employees,
  })

  it('hides and clears the company, and the employees that read it, for a personal account', () => {
    const personal = input('personal', { name: 'x', vatId: 'bad', size: 'large' }, 'abc')
    expect(hidden(json, personal)).toEqual([
      'company',
      'heading',
      'company.name',
      'company.vatId',
      'company.size',
      'employees',
    ])
    expect(issuesOf(json, personal)).toEqual([])
    expect(outputOf(json, personal)).toEqual({
      accountType: 'personal',
      fullName: 'Ana',
      company: { name: undefined, vatId: undefined, size: undefined },
      employees: undefined,
    })
  })

  it('validates the company of a business account', () => {
    const business = input('business', {}, undefined)
    expect(hidden(json, business)).toEqual(['employees'])
    expect(issuesOf(json, business)).toEqual([
      'company.name: Required',
      'company.vatId: Required',
      'company.size: Required',
    ])
  })

  it('submits no employees that fail their rules while hidden', () => {
    const small = input('business', { name: 'Acme', vatId: 'DE123456789', size: 'small' }, 5)
    expect(issuesOf(json, small)).toEqual([])
    expect(outputOf(json, small)).toMatchObject({ employees: undefined })
  })

  it('validates the employees once they show', () => {
    const company = { name: 'Acme', vatId: 'DE123456789', size: 'medium' }
    expect(issuesOf(json, input('business', company, 5))).toEqual(['employees: At least 11'])
    expect(outputOf(json, input('business', company, 40))).toEqual({
      accountType: 'business',
      fullName: 'Ana',
      company,
      employees: 40,
    })
  })
})

describe('shipping to the billing address', () => {
  const json = fixtures.shipping
  const billing = { street: 'Main 1', zip: '1010', city: 'Vienna' }
  const blank = { street: undefined, zip: undefined, city: undefined, country: undefined }

  it('starts with the shipping address blank, without its default country', () => {
    expect(builder.getInitialInput(json)).toEqual({
      billing: {},
      sameAsBilling: true,
      shipping: {},
    })
  })

  it('submits no shipping address while it ships to the billing one, and skips the form rule', () => {
    const input = {
      billing,
      sameAsBilling: true,
      shipping: { street: 'Old 2', zip: '99999', city: 'Graz', country: 'AT' },
      confirmZip: '99999',
    }
    expect(hidden(json, input)).toEqual([
      'shipping',
      'shipping.street',
      'shipping.zip',
      'shipping.city',
      'shipping.country',
      'confirmZip',
    ])
    expect(issuesOf(json, input)).toEqual([])
    // A plain hide still submits a valid value: that is its cost.
    expect(outputOf(json, input)).toEqual({
      billing,
      sameAsBilling: true,
      shipping: blank,
      confirmZip: '99999',
    })
  })

  it('lists the shipping fields to clear when it is ticked again', () => {
    const state = builder.getVisibility(json).of({
      billing,
      sameAsBilling: true,
      shipping: { street: 'Old 2', zip: '99999', city: '', country: 'DE' },
    })
    expect(state.toClear).toEqual([
      { path: ['shipping', 'street'], input: undefined },
      { path: ['shipping', 'zip'], input: undefined },
      { path: ['shipping', 'country'], input: undefined },
    ])
  })

  it('validates the shipping address once it is unticked', () => {
    const input = { billing, sameAsBilling: false, shipping: blank, confirmZip: undefined }
    expect(hidden(json, input)).toEqual(['paragraph', 'confirmZip'])
    expect(issuesOf(json, input)).toEqual([
      'shipping.street: Required',
      'shipping.zip: Required',
      'shipping.city: Required',
    ])
  })

  it('runs the form rule once both ZIPs show', () => {
    const shipping = { street: 'Side 3', zip: '8010', city: 'Graz', country: 'AT' }
    const input = { billing, sameAsBilling: false, shipping, confirmZip: '8011' }
    expect(hidden(json, input)).toEqual(['paragraph'])
    expect(issuesOf(json, input)).toEqual(['confirmZip: The ZIPs differ'])
    expect(outputOf(json, { ...input, confirmZip: '8010' })).toEqual({
      ...input,
      confirmZip: '8010',
    })
  })
})

describe('order lines with conditions per item', () => {
  const json = fixtures.order
  const line = (
    kind: unknown,
    sku: unknown,
    quantity: unknown,
    hours: unknown,
    giftNote: unknown,
  ) => ({
    kind,
    sku,
    quantity,
    hours,
    giftNote,
  })

  it('hides the fields of each line by its kind, and validates the rest', () => {
    const input = {
      isGift: true,
      lines: [
        line('product', '', 2, undefined, 'For Bo'),
        line('service', 'X-1', 1, undefined, ''),
        line('discount', 'D', 0, 3, 'hi'),
        line(undefined, '', 1, undefined, ''),
      ],
    }
    expect(hidden(json, input, [0])).toEqual(['lines.*.hours'])
    expect(hidden(json, input, [1])).toEqual(['lines.*.sku'])
    expect(hidden(json, input, [2])).toEqual([
      'lines.*.sku',
      'lines.*.quantity',
      'lines.*.hours',
      'lines.*.giftNote',
    ])
    expect(hidden(json, input, [3])).toEqual(['lines.*.sku', 'lines.*.hours', 'lines.*.giftNote'])
    expect(issuesOf(json, input)).toEqual([
      'lines.0.sku: Required',
      'lines.1.hours: Required',
      'lines.3.kind: Required',
    ])
  })

  it('submits what a plain hide keeps, and nothing of what is cleared', () => {
    const input = {
      isGift: false,
      lines: [
        line('product', 'P-9', 2, 7, 'For Bo'),
        line('service', '', 1, 3, ''),
        line('discount', '', undefined, undefined, ''),
      ],
    }
    expect(issuesOf(json, input)).toEqual([])
    expect(outputOf(json, input)).toEqual({
      isGift: false,
      lines: [
        line('product', 'P-9', 2, 7, 'For Bo'),
        line('service', undefined, 1, 3, undefined),
        line('discount', undefined, undefined, undefined, undefined),
      ],
    })
  })

  it('still needs a line', () => {
    expect(issuesOf(json, { isGift: false, lines: [] })).toEqual(['lines: Add at least one line'])
  })
})

describe('a sign-up with a step for businesses', () => {
  const json = fixtures['sign-up']
  const { steps } = builder.getLayout(json)
  const visibility = builder.getVisibility(json)
  const input = (accountType: string, newsletter: boolean, topics: string[]) => ({
    email: 'ana@example.com',
    accountType,
    company: { name: 'Acme', vatId: 'DE1' },
    newsletter,
    topics,
    otherTopic: 'Cats',
    acceptTerms: true,
  })

  it('skips the company step for a personal account, and clears its fields', () => {
    const personal = input('personal', false, [])
    expect(
      steps
        .filter((step) => visibility.of(personal).isStepHidden(step))
        .map((step) => step.step.id),
    ).toEqual(['company'])
    expect(visibility.of(personal).toClear).toEqual([
      { path: ['company', 'name'], input: undefined },
      { path: ['company', 'vatId'], input: undefined },
    ])
    expect(outputOf(json, personal)).toEqual({
      email: 'ana@example.com',
      accountType: 'personal',
      company: { name: undefined, vatId: undefined },
      newsletter: false,
      topics: undefined,
      otherTopic: 'Cats',
      acceptTerms: true,
    })
  })

  it('shows the company step for a business account', () => {
    const business = input('business', false, [])
    expect(steps.filter((step) => visibility.of(business).isStepHidden(step))).toEqual([])
    expect(outputOf(json, business)).toMatchObject({ company: { name: 'Acme', vatId: 'DE1' } })
  })

  it('asks for the topics only with the newsletter, and for another topic only with "Other"', () => {
    expect(issuesOf(json, input('personal', true, []))).toEqual(['topics: Pick a topic'])
    expect(issuesOf(json, { ...input('personal', true, ['other']), otherTopic: '' })).toEqual([
      'otherTopic: Required',
    ])
    expect(issuesOf(json, { ...input('personal', true, ['news']), otherTopic: '' })).toEqual([])
    const fields = builder.getFieldTree(json)
    const state = visibility.of(input('personal', true, ['news']))
    expect(state.isHidden(findField(fields, 'otherTopic'), [])).toBe(true)
    expect(state.isHidden(findField(fields, 'topics'), [])).toBe(false)
  })
})
