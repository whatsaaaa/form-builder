import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { expect, it } from 'vitest'
import { fixtures } from './fixtures'

const profile: JsonForm = {
  version: '1',
  fields: [
    { name: 'name', type: 'text' },
    { name: 'country', type: 'text', default: 'RS' },
    { name: 'age', type: 'number', default: 18 },
  ],
}

const address = { street: 'Ilica 1', zip: '10000', city: 'Zagreb' }

/**
 * What a form starts with for the `initialInput` of `useJsonForm`, as its API page says. A blank
 * field is left out of `starts`.
 */
interface InitialInputCase {
  name: string
  json: JsonForm
  initialInput: unknown
  starts: Record<string, unknown>
}

const cases: InitialInputCase[] = [
  {
    name: 'keeps the default of a field it leaves out',
    json: profile,
    initialInput: { name: 'Ana' },
    starts: { name: 'Ana', country: 'RS', age: 18 },
  },
  {
    name: 'takes a value over the default of its field',
    json: profile,
    initialInput: { name: 'Ana', country: 'HR', age: 30 },
    starts: { name: 'Ana', country: 'HR', age: 30 },
  },
  {
    name: 'starts a field blank whose key is there without a value',
    json: profile,
    initialInput: { country: undefined, age: null },
    starts: { age: null },
  },
  ...[undefined, null, 'Ana', ['Ana']].map((initialInput) => ({
    name: `changes nothing when it is ${JSON.stringify(initialInput)}`,
    json: profile,
    initialInput,
    starts: { country: 'RS', age: 18 },
  })),
  {
    name: 'merges the fields of a group over the defaults of the others',
    json: fixtures.group,
    initialInput: { address: { city: 'Zagreb' } },
    starts: { address: { city: 'Zagreb', country: 'rs' } },
  },
  ...[undefined, null, 'Zagreb', ['Zagreb']].map((given) => ({
    name: `starts the fields of a group blank that is given ${JSON.stringify(given)}`,
    json: fixtures.group,
    initialInput: { address: given },
    starts: { address: {} },
  })),
  {
    name: 'takes a list whole, each item over what a new item starts with',
    json: fixtures.array,
    initialInput: { lines: [{ product: 'Pen' }, { product: 'Ink', quantity: 3 }] },
    starts: {
      tags: ['new'],
      lines: [
        { product: 'Pen', quantity: 1 },
        { product: 'Ink', quantity: 3 },
      ],
    },
  },
  {
    name: 'starts an item of a list blank that is no object',
    json: fixtures.array,
    initialInput: { tags: ['a'], lines: [undefined, 'Pen', ['Pen']] },
    starts: { tags: ['a'], lines: [{}, {}, {}] },
  },
  {
    name: 'starts a list empty that is given anything but an array',
    json: fixtures.array,
    initialInput: { tags: 'new', lines: { product: 'Pen' } },
    starts: { tags: [], lines: [] },
  },
  {
    name: 'starts a field blank that its conditions clear for the input',
    json: fixtures['affects/shipping'],
    initialInput: { shipping: address },
    starts: { billing: {}, sameAsBilling: true, shipping: {} },
  },
  {
    name: 'keeps the value of a field that the input shows',
    json: fixtures['affects/shipping'],
    initialInput: { sameAsBilling: false, shipping: address, confirmZip: '10000' },
    starts: {
      billing: {},
      sameAsBilling: false,
      shipping: { ...address, country: 'DE' },
      confirmZip: '10000',
    },
  },
]

/** Runs every case on `start`: the input of a form an adapter makes for the `initialInput`. */
export function runInitialInputCases(start: (json: JsonForm, initialInput: unknown) => unknown) {
  it.each(cases)('$name', ({ json, initialInput, starts }) => {
    expect(start(json, initialInput)).toEqual(starts)
  })
}
