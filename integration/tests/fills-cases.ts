// The fills of the fills package, through an adapter: a form made with a builder that has
// `fills()`. The Formisch bindings don't run fills, so only the adapters' tests run these.
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import { expect, it } from 'vitest'
import profileMap from '../../fixtures/fills/profile-map.json'
import { expectEnd, perform, type RenderedForm } from './run-scenarios'
import { choose, fill, type Scenario, submit } from './scenarios'

/** A profile that fills the names and the city from a map, and starts with Profile A. */
const profileMapForm = profileMap as unknown as JsonForm

const scenarios: Omit<Scenario, 'fixture'>[] = [
  {
    name: 'starts with the values of the default option',
    steps: [],
    values: { firstName: 'Marko', lastName: 'Petrović', 'address.city': 'Beograd' },
  },
  {
    name: 'fills the fields of the option chosen, and submits them',
    steps: [choose('profile', 'Profile B'), submit],
    values: { firstName: 'Jelena', lastName: 'Jovanović', 'address.city': 'Novi Sad' },
    output: {
      profile: 'b',
      firstName: 'Jelena',
      lastName: 'Jovanović',
      address: { city: 'Novi Sad' },
    },
  },
  {
    name: 'keeps a field the user edited, and blanks one the option has no value for',
    steps: [fill('firstName', 'Marta'), choose('profile', 'Profile C')],
    values: { firstName: 'Marta', lastName: 'Nikolić', 'address.city': '' },
  },
  {
    name: 'empties every field it set when the option is cleared',
    steps: [fill('firstName', 'Marta'), choose('profile')],
    values: { firstName: '', lastName: '', 'address.city': '' },
  },
]

/** Runs every fills scenario on the profile form from `render`. */
export function runFillsScenarios(
  render: (json: JsonForm) => RenderedForm | Promise<RenderedForm>,
) {
  it.each(scenarios)('$name', async (scenario) => {
    const form = await render(profileMapForm)
    for (const step of scenario.steps) await form.update(() => perform(form.root, step))
    expectEnd(form, scenario)
  })
}

/**
 * What a form with fills starts with for the `initialInput` of `useJsonForm`. A blank field is
 * left out of `starts`.
 */
const initialInputCases: {
  name: string
  initialInput: unknown
  starts: Record<string, unknown>
}[] = [
  {
    name: 'fills the values of the default without an initial input',
    initialInput: undefined,
    starts: {
      profile: 'a',
      firstName: 'Marko',
      lastName: 'Petrović',
      address: { city: 'Beograd' },
    },
  },
  {
    name: 'fills nothing for a trigger it gives',
    initialInput: { profile: 'b', firstName: 'Ana' },
    starts: { profile: 'b', firstName: 'Ana', address: {} },
  },
  {
    name: 'fills nothing for a trigger it gives blank',
    initialInput: { profile: undefined },
    starts: { address: {} },
  },
  {
    name: 'fills the values of the default, but not over the fields it gives',
    initialInput: { firstName: 'Ana', address: { city: undefined } },
    starts: { profile: 'a', firstName: 'Ana', lastName: 'Petrović', address: {} },
  },
]

/** Runs every case on `start`: the input of a form with fills for the `initialInput`. */
export function runFillsInitialInputCases(
  start: (json: JsonForm, initialInput: unknown) => unknown,
) {
  it.each(initialInputCases)('$name', ({ initialInput, starts }) => {
    expect(start(profileMapForm, initialInput)).toEqual(starts)
  })
}
