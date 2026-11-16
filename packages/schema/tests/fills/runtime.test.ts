import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSchemaBuilder,
  DefinitionError,
  type FillErrorInfo,
  type FillResult,
  type JsonField,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { hideWhen } from '../extensions/hide-when'
import { deferred, openForm, prefill, type Prefill, type Source } from './prefill'

const profiles = {
  a: { firstName: 'Marko', lastName: 'Petrović', 'address.city': 'Beograd' },
  b: { firstName: 'Jelena', lastName: 'Jovanović', 'address.city': 'Novi Sad' },
  c: { firstName: 'Nikola', lastName: 'Nikolić' },
}

const options = ['a', 'b', 'c', 'd'].map((value) => ({ value, label: `Profile ${value}` }))

/** A profile select with `fill`, and the fields it fills. */
const profileForm = (
  fill: Prefill,
  profile: Partial<JsonField> = {},
  ...more: JsonField[]
): JsonForm => ({
  version: '1',
  fields: [
    { name: 'profile', type: 'select', options, prefill: fill, ...profile } as JsonField,
    { name: 'firstName', type: 'text', required: true },
    { name: 'lastName', type: 'text' },
    { name: 'address', type: 'group', fields: [{ name: 'city', type: 'text' }] },
    ...more,
  ],
})

const mapForm = (
  profile: Partial<JsonField> = {},
  overwrite?: Prefill['overwrite'],
  ...more: JsonField[]
) => profileForm({ map: profiles, ...(overwrite && { overwrite }) }, profile, ...more)

const sourceForm = (profile: Partial<JsonField> = {}) =>
  profileForm({ source: 'profiles', fields: ['firstName', 'lastName', 'address.city'] }, profile)

/** A source that waits to be settled by hand, call by call. */
function handSource() {
  const calls: {
    value: unknown
    signal: { readonly aborted: boolean }
    input: unknown
    trigger: string
    settle: ReturnType<typeof deferred<FillResult>>
  }[] = []
  const source: Source = (value, { signal, input, trigger }) => {
    const settle = deferred<FillResult>()
    calls.push({ value, signal, input, trigger, settle })
    return settle.promise
  }
  return { calls, source }
}

const builder = createSchemaBuilder({ extensions: [prefill(), hideWhen()] })

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getFills', () => {
  it('does nothing without fills', async () => {
    const json: JsonForm = { version: '1', fields: [{ name: 'firstName', type: 'text' }] }
    for (const fills of [builder.getFills(json), createSchemaBuilder().getFills(json)]) {
      expect(fills.active).toBe(false)
      expect(fills.triggers).toEqual([])
      const input = { firstName: 'Ana' }
      expect(fills.initialInput(input, undefined)).toBe(input)
      const run = fills.open({
        getInput: () => input,
        setInput: () => expect.unreachable(),
        setStartInput: () => expect.unreachable(),
      })
      const listener = vi.fn()
      const unsubscribe = run.subscribe(listener)
      run.start()
      run.update()
      run.stop()
      unsubscribe()
      await run.settled()
      expect(run.state.pending).toEqual([])
      expect(run.state.isPending(['firstName'])).toBe(false)
      expect(listener).not.toHaveBeenCalled()
    }
  })

  it('throws the issues of the definition, like build()', () => {
    expect(() => builder.getFills(profileForm({ map: { a: { nope: 'x' } } }))).toThrow(
      DefinitionError,
    )
  })

  it('gives the path of each trigger, in document order', () => {
    const json: JsonForm = {
      version: '1',
      fields: [
        {
          name: 'group',
          type: 'group',
          fields: [{ name: 'second', type: 'text', prefill: { map: { y: { third: 'z' } } } }],
        },
        { name: 'first', type: 'text', prefill: { map: { x: { 'group.second': 'y' } } } },
        { name: 'third', type: 'text' },
      ],
    } as never
    expect(builder.getFills(json).triggers).toEqual([['group', 'second'], ['first']])
  })
})

describe('a fill on change', () => {
  it('sets the fields when the trigger gets a value, and not again for the same value', () => {
    const form = openForm(builder, mapForm())
    form.type('profile', 'b')
    expect(form.input).toEqual({
      profile: 'b',
      firstName: 'Jelena',
      lastName: 'Jovanović',
      address: { city: 'Novi Sad' },
    })
    expect(form.log).toEqual([
      'set firstName "Jelena"',
      'set lastName "Jovanović"',
      'set address.city "Novi Sad"',
    ])
    form.type('profile', 'b')
    expect(form.log).toHaveLength(3)
  })

  it('runs for a change of the trigger made by any code, like setInput', () => {
    const form = openForm(builder, mapForm())
    form.run.update()
    expect(form.log).toEqual([])
    form.type('profile', 'a')
    expect(form.input['firstName']).toBe('Marko')
  })

  it("leaves the fields the user edited since the last fill, unless it is 'always'", () => {
    const form = openForm(builder, mapForm())
    form.type('profile', 'a')
    form.type('firstName', 'Marta')
    form.type('profile', 'c')
    expect(form.input).toMatchObject({ firstName: 'Marta', lastName: 'Nikolić' })

    const always = openForm(builder, mapForm({}, 'always'))
    always.type('profile', 'a')
    always.type('firstName', 'Marta')
    always.type('profile', 'c')
    expect(always.input['firstName']).toBe('Nikola')
  })

  it('sets a field the user emptied, or set back to what the fill wrote', () => {
    const form = openForm(builder, mapForm())
    form.type('profile', 'a')
    form.type('firstName', '')
    form.type('lastName', 'Ilić')
    form.type('lastName', 'Petrović')
    form.type('profile', 'b')
    expect(form.input).toMatchObject({ firstName: 'Jelena', lastName: 'Jovanović' })
  })

  it('sets nothing for an input a field holds already, and counts it as unedited', () => {
    const form = openForm(builder, mapForm())
    form.type('firstName', 'Jelena')
    form.type('profile', 'b')
    expect(form.log).toEqual(['set lastName "Jovanović"', 'set address.city "Novi Sad"'])
  })

  it('blanks the fields a value has nothing for, and every field for a value with no entry', () => {
    const form = openForm(builder, mapForm())
    form.type('profile', 'a')
    form.type('profile', 'c')
    expect(form.input['address']).toEqual({})
    form.type('profile', 'd')
    expect(form.input).toEqual({ profile: 'd', address: {} })
  })

  it('reads the trigger as a field of its kind reads it, and an odd input as empty', () => {
    const json: JsonForm = {
      version: '1',
      fields: [
        {
          name: 'seats',
          type: 'select',
          options: [
            { value: 1, label: 'One' },
            { value: 2, label: 'Two' },
          ],
          prefill: { map: { '2': { note: 'Two seats' } } },
        },
        { name: 'note', type: 'text' },
      ],
    } as never
    const form = openForm(builder, json)
    form.type('seats', '2')
    expect(form.input['note']).toBe('Two seats')
    form.type('seats', { value: 2 })
    expect(form.input['note']).toBeUndefined()
  })
})

describe('a field with a list of values', () => {
  it('counts as unedited while it holds the same items the fill set', () => {
    const json: JsonForm = {
      version: '1',
      fields: [
        {
          name: 'team',
          type: 'select',
          options: [
            { value: 'web', label: 'Web' },
            { value: 'data', label: 'Data' },
          ],
          prefill: { map: { web: { days: ['1', '2'] }, data: { days: ['3'] } } },
        },
        {
          name: 'days',
          type: 'multiselect',
          options: ['1', '2', '3'].map((value) => ({ value, label: `Day ${value}` })),
        },
      ],
    } as never
    const form = openForm(builder, json)
    form.type('team', 'web')
    form.type('days', ['1', '2'])
    form.type('team', 'data')
    expect(form.input['days']).toEqual(['3'])
    form.type('days', ['1'])
    form.type('team', 'web')
    expect(form.input['days']).toEqual(['1'])
    form.type('team', undefined)
    expect(form.input['days']).toEqual([])
  })
})

describe('a cleared trigger', () => {
  it('blanks every field its fill sets, edited or not', () => {
    const form = openForm(builder, mapForm())
    form.type('profile', 'a')
    form.type('firstName', 'Marta')
    form.type('profile', undefined)
    expect(form.input).toEqual({ address: {} })
    expect(form.log.slice(-3)).toEqual([
      'set firstName undefined',
      'set lastName undefined',
      'set address.city undefined',
    ])
  })

  it('blanks every field any entry of a map names, even one the last value had nothing for', () => {
    const form = openForm(builder, mapForm())
    form.type('profile', 'c')
    form.type('address.city', 'Niš')
    form.type('profile', '')
    expect(form.input).toEqual({ profile: '', address: {} })
  })

  it('cancels the pending fill, whose values come too late', async () => {
    const { calls, source } = handSource()
    const form = openForm(
      createSchemaBuilder({ extensions: [prefill({ profiles: source })] }),
      sourceForm(),
    )
    form.type('profile', 'a')
    form.type('firstName', 'Marta')
    form.type('profile', undefined)
    expect(calls[0]?.signal.aborted).toBe(true)
    expect(form.run.state.pending).toEqual([])
    calls[0]?.settle.resolve(profiles.a)
    await form.run.settled()
    await Promise.resolve()
    expect(form.input).toEqual({ address: {} })
  })

  it('clears nothing when the form starts with it empty', () => {
    const json = mapForm()
    const form = openForm(builder, json, { given: { firstName: 'Ana' } })
    form.run.start()
    form.run.update()
    expect(form.input['firstName']).toBe('Ana')
    expect(form.log).toEqual([])
  })

  it('is one its conditions hide and clear, and not one they only hide', () => {
    const json = mapForm({ hideWhen: { field: 'anonymous', clear: true } } as never, undefined, {
      name: 'anonymous',
      type: 'checkbox',
    })
    const form = openForm(builder, json)
    form.type('profile', 'a')
    form.type('anonymous', true)
    expect(form.input).toEqual({ anonymous: true, address: {} })

    const hidden = mapForm({ hideWhen: { field: 'anonymous' } } as never, undefined, {
      name: 'anonymous',
      type: 'checkbox',
    })
    const kept = openForm(builder, hidden)
    kept.type('anonymous', true)
    kept.type('profile', 'b')
    expect(kept.input['firstName']).toBe('Jelena')
  })
})

describe('the fields with conditions', () => {
  it('sets a field they hide, and not one they clear for the values the fill sets', () => {
    const json: JsonForm = {
      version: '1',
      fields: [
        {
          name: 'kind',
          type: 'select',
          options: [
            { value: 'person', label: 'Person' },
            { value: 'company', label: 'Company' },
          ],
          prefill: {
            map: {
              person: { name: 'Marko Petrović', company: false, vat: 'RS1', note: 'Private' },
              company: { name: 'Petrović d.o.o.', company: true, vat: 'RS2', note: 'Firm' },
            },
          },
        },
        { name: 'name', type: 'text' },
        { name: 'company', type: 'checkbox' },
        { name: 'vat', type: 'text', hideWhen: { field: 'company', equals: false, clear: true } },
        { name: 'note', type: 'text', hideWhen: { field: 'company', equals: false } },
      ],
    } as never
    const form = openForm(builder, json)
    form.type('kind', 'person')
    expect(form.input).toEqual({
      kind: 'person',
      name: 'Marko Petrović',
      company: false,
      note: 'Private',
    })
    expect(form.log).not.toContain('set vat "RS1"')
    form.type('kind', 'company')
    expect(form.input).toMatchObject({ company: true, vat: 'RS2', note: 'Firm' })
  })

  it('blank a trigger they clear, and its fields, when its fill is what clears it', () => {
    const json: JsonForm = {
      version: '1',
      fields: [
        {
          name: 'profile',
          type: 'select',
          options,
          hideWhen: { field: 'company', equals: true, clear: true },
          prefill: { map: { a: { company: true } } },
        },
        { name: 'company', type: 'checkbox' },
      ],
    } as never
    // Like the adapters, which blank what the conditions clear in a watch, after the change.
    const later = openForm(builder, json, { clearLater: true })
    later.type('profile', 'a')
    expect(later.input).toEqual({ profile: 'a', company: true })
    later.clear()
    expect(later.input).toEqual({})
    expect(later.log).toEqual(['set company true', 'set company undefined'])

    const now = openForm(builder, json)
    now.type('profile', 'a')
    expect(now.input).toEqual({})
    expect(now.log).toEqual(['set company true', 'set company undefined'])
  })
})

describe('a fill with a source', () => {
  it('reports what is pending, in a state that changes only when that does', async () => {
    const { calls, source } = handSource()
    const form = openForm(
      createSchemaBuilder({ extensions: [prefill({ profiles: source })] }),
      sourceForm(),
    )
    const listener = vi.fn()
    const unsubscribe = form.run.subscribe(listener)
    const idle = form.run.state
    form.type('profile', 'a')
    const waiting = form.run.state
    expect(waiting.pending).toEqual(['profile'])
    expect(
      ['profile', 'firstName', 'address.city'].map((path) => waiting.isPending(path.split('.'))),
    ).toEqual([true, true, true])
    expect(waiting.isPending(['address'])).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(calls[0]).toMatchObject({ value: 'a', trigger: 'profile', input: { profile: 'a' } })

    form.type('firstName', 'Mar')
    expect(form.run.state).toBe(waiting)
    calls[0]?.settle.resolve(profiles.a)
    await form.run.settled()
    expect(form.run.state).toBe(idle)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(form.input).toEqual({
      profile: 'a',
      firstName: 'Mar',
      lastName: 'Petrović',
      address: { city: 'Beograd' },
    })
    unsubscribe()
    form.type('profile', 'b')
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('applies only the newest value, and aborts the calls before it', async () => {
    const { calls, source } = handSource()
    const onError = vi.fn()
    const form = openForm(
      createSchemaBuilder({ extensions: [prefill({ profiles: source })] }),
      sourceForm(),
      { onError },
    )
    form.type('profile', 'a')
    form.type('profile', 'b')
    form.type('profile', 'a')
    expect(calls.map(({ signal }) => signal.aborted)).toEqual([true, true, false])
    calls[2]?.settle.resolve(profiles.a)
    calls[1]?.settle.resolve(profiles.b)
    calls[0]?.settle.reject(new Error('aborted'))
    await form.run.settled()
    await new Promise((resolve) => setTimeout(resolve))
    expect(form.input['firstName']).toBe('Marko')
    expect(onError).not.toHaveBeenCalled()
  })

  it('stops the calls pending when the form closes', async () => {
    const { calls, source } = handSource()
    const form = openForm(
      createSchemaBuilder({ extensions: [prefill({ profiles: source })] }),
      sourceForm(),
    )
    form.type('profile', 'a')
    form.run.stop()
    expect(calls[0]?.signal.aborted).toBe(true)
    expect(form.run.state.pending).toEqual([])
    calls[0]?.settle.resolve(profiles.a)
    await form.run.settled()
    await Promise.resolve()
    expect(form.log).toEqual([])
  })

  it('settles without waiting for a call a new value dropped', async () => {
    const { calls, source } = handSource()
    const form = openForm(
      createSchemaBuilder({ extensions: [prefill({ profiles: source })] }),
      sourceForm(),
    )
    // The call for 'a' never answers.
    form.type('profile', 'a')
    let settled = false
    void form.run.settled().then(() => {
      settled = true
    })
    form.type('profile', 'b')
    calls[1]?.settle.resolve(profiles.b)
    await new Promise((resolve) => setTimeout(resolve))
    expect(settled).toBe(true)
    expect(form.input['firstName']).toBe('Jelena')
  })

  it('settles once stop() cancels the calls pending', async () => {
    const { source } = handSource()
    const form = openForm(
      createSchemaBuilder({ extensions: [prefill({ profiles: source })] }),
      sourceForm(),
    )
    // The call never answers.
    form.type('profile', 'a')
    let settled = false
    void form.run.settled().then(() => {
      settled = true
    })
    form.run.stop()
    await new Promise((resolve) => setTimeout(resolve))
    expect(settled).toBe(true)
  })

  it('gives a symbol for no object of values the way it can', () => {
    const onError = vi.fn()
    const sources = { profiles: () => Symbol('Marko') as never }
    const form = openForm(createSchemaBuilder({ extensions: [prefill(sources)] }), sourceForm(), {
      onError,
    })
    form.type('profile', 'a')
    expect(onError.mock.calls[0]?.[0]).toEqual(
      new TypeError('The fill of "profile" gave Symbol(Marko), not an object of values'),
    )
  })

  it('runs a source that answers at once without ever being pending', () => {
    const fills = prefill({ profiles: (value) => profiles[value as 'a'] })
    const form = openForm(createSchemaBuilder({ extensions: [fills] }), sourceForm())
    const listener = vi.fn()
    form.run.subscribe(listener)
    form.type('profile', 'b')
    expect(form.input['lastName']).toBe('Jovanović')
    expect(listener).not.toHaveBeenCalled()
  })

  it('runs every fill a trigger has, and lists it as pending once', async () => {
    const first = handSource()
    const second = handSource()
    const both = createSchemaBuilder({
      extensions: [prefill({ profiles: first.source }), prefill({ notes: second.source }, 'notes')],
    })
    const json = profileForm(
      { source: 'profiles', fields: ['firstName', 'lastName', 'address.city'] },
      { notes: { source: 'notes', fields: ['note'] } } as never,
      { name: 'note', type: 'text' },
    )
    const form = openForm(both, json)
    form.type('profile', 'a')
    expect(form.run.state.pending).toEqual(['profile'])
    second.calls[0]?.settle.resolve({ note: 'Second' })
    await Promise.resolve()
    await Promise.resolve()
    expect(form.run.state.pending).toEqual(['profile'])
    expect(form.run.state.isPending(['note'])).toBe(false)
    expect(form.run.state.isPending(['firstName'])).toBe(true)
    first.calls[0]?.settle.resolve(profiles.a)
    await form.run.settled()
    expect(form.input).toMatchObject({ firstName: 'Marko', note: 'Second' })
  })
})

describe('errors', () => {
  const info = (value: string, field?: string): FillErrorInfo => ({
    trigger: 'profile',
    value,
    ...(field && { field }),
  })

  it('go to onError: a throw, a rejection, and values that are no object', async () => {
    const onError = vi.fn()
    const failing = new Error('Down')
    const sources: Record<string, Source> = {
      profiles: (value) => {
        if (value === 'a') throw failing
        if (value === 'b') return Promise.reject(failing)
        return (value === 'c' ? 'Nikola' : [profiles.a]) as never
      },
    }
    const form = openForm(createSchemaBuilder({ extensions: [prefill(sources)] }), sourceForm(), {
      onError,
    })
    for (const value of ['a', 'b', 'c', 'd']) {
      form.type('profile', value)
      await form.run.settled()
    }
    expect(onError.mock.calls).toEqual([
      [failing, info('a')],
      [failing, info('b')],
      [new TypeError('The fill of "profile" gave "Nikola", not an object of values'), info('c')],
      [
        new TypeError(
          'The fill of "profile" gave [{"firstName":"Marko","lastName":"Petrović","address.city":"Beograd"}], not an object of values',
        ),
        info('d'),
      ],
    ])
    expect(form.log).toEqual([])
  })

  it("report a value its field can't hold, and blank that field", () => {
    const onError = vi.fn()
    const map = { a: { firstName: 'Marko', age: 'abc' } }
    const json = profileForm(
      { map, overwrite: 'always' },
      {},
      {
        name: 'age',
        type: 'number',
      },
    )
    const form = openForm(builder, json, { onError })
    form.type('age', 30)
    form.type('profile', 'a')
    expect(form.input).toMatchObject({ firstName: 'Marko', age: undefined })
    expect(onError).toHaveBeenCalledWith(
      new TypeError('"age" can\'t hold "abc": Invalid type: Expected number but received "abc"'),
      info('a', 'age'),
    )
  })

  it('are thrown in a microtask without onError', () => {
    const queued: (() => void)[] = []
    const scheduler = globalThis as unknown as { queueMicrotask(callback: () => void): void }
    vi.spyOn(scheduler, 'queueMicrotask').mockImplementation((callback) => {
      queued.push(callback)
    })
    const failing = new Error('Down')
    const sources = {
      profiles: () => {
        throw failing
      },
    }
    const form = openForm(createSchemaBuilder({ extensions: [prefill(sources)] }), sourceForm())
    form.type('profile', 'a')
    expect(queued).toHaveLength(1)
    expect(queued[0]).toThrow(failing)
  })

  it('come from onError called as a method', () => {
    const options = {
      errors: [] as unknown[],
      onError(error: unknown) {
        this.errors.push(error)
      },
    }
    const sources = { profiles: () => 'x' as never }
    const form = openForm(
      createSchemaBuilder({ extensions: [prefill(sources)] }),
      sourceForm(),
      options,
    )
    form.type('profile', 'a')
    expect(options.errors).toHaveLength(1)
  })
})

describe('the form as it starts', () => {
  /** A builder whose static fill on `a`, which starts with a value, sets `b` to `values()`. */
  const staticFill = (values: () => unknown) =>
    createSchemaBuilder({
      extensions: [
        {
          name: 'test',
          check(ctx) {
            const [trigger] = ctx.targets
            ctx.fill(trigger as never, {
              fields: [{ field: ctx.resolve('b', trigger as never) as never, at: [] }],
              overwrite: 'unedited',
              static: true,
              values: values as never,
            })
            return new Map()
          },
        },
      ],
    })
  const startsFilled: JsonForm = {
    version: '1',
    fields: [
      { name: 'a', type: 'text', default: 'x' },
      { name: 'b', type: 'text' },
    ],
  }

  it('throws a TypeError for a static fill that gives a promise, or no object of values', () => {
    const giving = (values: unknown) => staticFill(() => values).getInitialInput(startsFilled)
    expect(() => giving(Promise.resolve({}))).toThrow(
      new TypeError('The fill of "a" is static, so its values() can\'t give a promise'),
    )
    expect(() => giving('y')).toThrow(
      new TypeError('The fill of "a" gave "y", not an object of values'),
    )
    expect(giving({ b: 'y' })).toEqual({ a: 'x', b: 'y' })
  })

  it('runs the values() of a static fill only for getInitialInput()', () => {
    const values = vi.fn(() => 'not values')
    const broken = staticFill(values)
    expect(broken.validate(startsFilled)).toEqual({ success: true, issues: [] })
    expect([...broken.walkFields(startsFilled)].map(({ dataPath }) => dataPath)).toEqual([
      ['a'],
      ['b'],
    ])
    broken.build(startsFilled)
    broken.getFieldTree(startsFilled)
    broken.getLayout(startsFilled)
    broken.getVisibility(startsFilled)
    expect(broken.getFills(startsFilled).active).toBe(true)
    expect(values).not.toHaveBeenCalled()
    expect(() => broken.getInitialInput(startsFilled)).toThrow(TypeError)
    expect(values).toHaveBeenCalledOnce()
  })

  it("starts with a map's values for the trigger's default, not edited", () => {
    const json = mapForm({ default: 'a' })
    expect(builder.getInitialInput(json)).toEqual({
      profile: 'a',
      firstName: 'Marko',
      lastName: 'Petrović',
      address: { city: 'Beograd' },
    })
    const form = openForm(builder, json)
    form.run.start()
    form.run.update()
    expect(form.log).toEqual([])
    form.type('profile', 'b')
    expect(form.input['firstName']).toBe('Jelena')
  })

  it('fills nothing for a trigger the app gives, even with its default', () => {
    const json = mapForm({ default: 'a' })
    const given = { profile: 'a', firstName: 'Ana', lastName: 'Ilić' }
    expect(builder.getFills(json).initialInput({ ...given }, given)).toEqual(given)
    const form = openForm(builder, json, { given })
    form.run.start()
    expect(form.input).toEqual({ ...given, address: {} })
    form.type('profile', 'c')
    expect(form.input).toMatchObject({ firstName: 'Nikola', lastName: 'Nikolić' })
  })

  it('leaves the fields the app gives when the trigger fills from its default', () => {
    const json = mapForm({ default: 'a' })
    const fills = builder.getFills(json)
    expect(
      fills.initialInput({ profile: 'a', firstName: 'Ana', address: {} }, { firstName: 'Ana' }),
    ).toEqual({
      profile: 'a',
      firstName: 'Ana',
      lastName: 'Petrović',
      address: { city: 'Beograd' },
    })
    // A group given anything but an object starts with every field of it blank.
    expect(fills.initialInput({ profile: 'a' }, { address: null })).not.toHaveProperty('address')
    expect(fills.initialInput({ profile: 'a' }, 'not a record')).toMatchObject({
      firstName: 'Marko',
    })
  })

  it('fills nothing for a trigger with no value, or one its conditions clear', () => {
    expect(builder.getInitialInput(mapForm())).toEqual({ address: {} })
    const json = mapForm(
      { default: 'a', hideWhen: { field: 'anonymous', clear: true } } as never,
      undefined,
      { name: 'anonymous', type: 'checkbox', default: true },
    )
    expect(builder.getInitialInput(json)).toEqual({ anonymous: true, address: {} })
  })

  it('blanks a trigger the values clear, with its fields, whatever the order of the fields', () => {
    const plan = (more: Partial<JsonField> = {}) =>
      ({
        name: 'plan',
        type: 'select',
        options: [{ value: 'pro', label: 'Pro' }],
        ...more,
        hideWhen: { field: 'student', clear: true },
        prefill: { map: { pro: { seats: 10 } } },
      }) as JsonField
    const profile = (more: Partial<JsonField> = {}) =>
      ({
        name: 'profile',
        type: 'select',
        options,
        ...more,
        prefill: { map: { a: { student: true } } },
      }) as JsonField
    const seats: JsonField = { name: 'seats', type: 'number' }
    const student: JsonField = { name: 'student', type: 'checkbox' }
    const json = (first: JsonField, second: JsonField): JsonForm => ({
      version: '1',
      fields: [first, seats, second, student],
    })
    const expected = { profile: 'a', student: true }
    const pro = plan({ default: 'pro' })
    const a = profile({ default: 'a' })
    expect(builder.getInitialInput(json(pro, a))).toEqual(expected)
    expect(builder.getInitialInput(json(a, pro))).toEqual(expected)
    // As in an open form where the user picks the same values.
    const open = openForm(builder, json(plan(), profile()), { clearLater: true })
    open.type('plan', 'pro')
    open.type('profile', 'a')
    open.clear()
    expect(open.input).toEqual(expected)
    // A field the app gives keeps its value.
    const given = { seats: 3 }
    const fills = builder.getFills(json(pro, a))
    expect(fills.initialInput({ plan: 'pro', profile: 'a', seats: 3 }, given)).toEqual({
      ...expected,
      seats: 3,
    })
  })

  it('starts blank with a field its conditions clear as it starts, whatever the order', () => {
    type Field = Record<string, unknown>
    const json = (fields: Field[]): JsonForm => ({ version: '1', fields }) as never
    const tier = {
      name: 'tier',
      type: 'text',
      hideWhen: { field: 'vip', clear: true },
      prefill: { map: { gold: { discount: 5 } } },
    }
    const plan = {
      name: 'plan',
      type: 'text',
      hideWhen: { field: 'student', clear: true },
      prefill: { map: { pro: { vip: true } } },
    }
    const profile = (sets: Field) => ({
      name: 'profile',
      type: 'text',
      prefill: { map: { a: sets } },
    })
    const discount = { name: 'discount', type: 'number' }
    // A field like tier, but no trigger.
    const note = {
      name: 'note',
      type: 'text',
      default: 'hello',
      hideWhen: { field: 'vip', clear: true },
    }
    const vip = { name: 'vip', type: 'checkbox' }
    const student = { name: 'student', type: 'checkbox' }
    const cases: [fields: Field[], expected: Field][] = [
      // vip starts ticked, which clears tier, and the profile unticks it.
      [
        [tier, discount, note, profile({ vip: false }), { ...vip, default: true }],
        { profile: 'a', vip: false },
      ],
      // plan ticks vip, which clears tier, and the profile clears plan, which unticks vip.
      [
        [plan, tier, discount, note, profile({ student: true }), vip, student],
        { profile: 'a', student: true },
      ],
    ]
    const choices: Record<string, string> = { plan: 'pro', tier: 'gold', profile: 'a' }
    for (const [fields, expected] of cases) {
      const starting = fields.map((field) => {
        const start = choices[field['name'] as string]
        return start === undefined ? field : { ...field, default: start }
      })
      expect(builder.getInitialInput(json(starting))).toEqual(expected)
      expect(builder.getInitialInput(json([...starting].reverse()))).toEqual(expected)
      // As in an open form where the user picks the same values, in the order of the fields.
      const open = openForm(builder, json(fields), { clearLater: true })
      for (const field of fields) {
        const choice = choices[field['name'] as string]
        if (choice === undefined) continue
        open.type(field['name'] as string, choice)
        open.clear()
      }
      expect(open.input).toEqual(expected)
      // A field the app gives keeps its value, as the conditions don't clear it once settled.
      const saved = openForm(builder, json(starting), { given: { note: 'mine' } })
      expect(saved.input).toEqual({ ...expected, note: 'mine' })
    }
  })

  it('starts blank with a trigger whose own values clear it', () => {
    const json: JsonForm = {
      version: '1',
      fields: [
        {
          name: 'profile',
          type: 'select',
          options,
          default: 'a',
          hideWhen: { field: 'company', equals: true, clear: true },
          prefill: { map: { a: { company: true } } },
        },
        { name: 'company', type: 'checkbox' },
      ],
    } as never
    expect(builder.getInitialInput(json)).toEqual({})
  })

  it('runs a source once the form starts, as the input it starts with', async () => {
    const { calls, source } = handSource()
    const sources = createSchemaBuilder({ extensions: [prefill({ profiles: source })] })
    const json = sourceForm({ default: 'a' })
    expect(sources.getInitialInput(json)).toEqual({ profile: 'a', address: {} })
    const form = openForm(sources, json)
    expect(calls).toHaveLength(0)
    form.run.start()
    expect(form.run.state.pending).toEqual(['profile'])
    calls[0]?.settle.resolve(profiles.a)
    await form.run.settled()
    expect(form.log).toEqual([
      'start firstName "Marko"',
      'start lastName "Petrović"',
      'start address.city "Beograd"',
    ])
    form.run.start()
    expect(calls).toHaveLength(1)
  })

  it("runs a source again on start() after stop() cancelled it, like React's StrictMode", async () => {
    const { calls, source } = handSource()
    const json = sourceForm({ default: 'a' })
    const form = openForm(
      createSchemaBuilder({ extensions: [prefill({ profiles: source })] }),
      json,
    )
    form.run.start()
    form.run.start()
    expect(calls).toHaveLength(1)
    form.run.stop()
    form.run.start()
    expect(calls).toHaveLength(2)
    calls[1]?.settle.resolve(profiles.b)
    await form.run.settled()
    expect(form.input['firstName']).toBe('Jelena')
  })

  it('skips the fields the app gives, and a trigger it gives, as a source starts', async () => {
    const sources = createSchemaBuilder({
      extensions: [prefill({ profiles: (value) => profiles[value as 'a'] })],
    })
    const json = sourceForm({ default: 'a' })
    const form = openForm(sources, json, { given: { firstName: 'Ana' } })
    form.run.start()
    expect(form.input).toMatchObject({ firstName: 'Ana', lastName: 'Petrović' })
    const record = openForm(sources, json, { given: { profile: 'b' } })
    record.run.start()
    expect(record.log).toEqual([])
  })

  it('leaves a source to the change when the trigger changed before the form started', () => {
    const { calls, source } = handSource()
    const form = openForm(
      createSchemaBuilder({ extensions: [prefill({ profiles: source })] }),
      sourceForm({ default: 'a' }),
    )
    form.type('profile', 'b')
    form.run.start()
    expect(calls.map(({ value }) => value)).toEqual(['b'])
  })

  it('leaves a source alone that changed before start() without update()', () => {
    const { calls, source } = handSource()
    const form = openForm(
      createSchemaBuilder({ extensions: [prefill({ profiles: source })] }),
      sourceForm({ default: 'a' }),
    )
    ;(form.input as Record<string, unknown>)['profile'] = 'c'
    form.run.start()
    expect(calls).toHaveLength(0)
  })
})

describe('a reset', () => {
  it('sets nothing, and the next value fills every field again', () => {
    const form = openForm(builder, mapForm({ default: 'a' }))
    form.type('profile', 'b')
    const log = [...form.log]
    form.reset()
    expect(form.log).toEqual(log)
    expect(form.input).toEqual({
      profile: 'a',
      firstName: 'Marko',
      lastName: 'Petrović',
      address: { city: 'Beograd' },
    })

    form.type('profile', 'b')
    expect(form.input).toEqual({
      profile: 'b',
      firstName: 'Jelena',
      lastName: 'Jovanović',
      address: { city: 'Novi Sad' },
    })
  })

  it('leaves a record as the app gave it, and fills it on the next value', () => {
    const record = { profile: 'b', firstName: 'Ana', lastName: 'Ilić' }
    const form = openForm(builder, mapForm(), { given: record })
    form.type('profile', 'c')
    const log = [...form.log]
    form.reset()
    expect(form.log).toEqual(log)
    expect(form.input).toEqual({ ...record, address: {} })

    form.type('profile', 'c')
    expect(form.input).toMatchObject({ firstName: 'Nikola', lastName: 'Nikolić' })
  })

  it('blanks nothing the app gave when the trigger started empty', () => {
    const form = openForm(builder, mapForm(), { given: { firstName: 'Ana' } })
    form.type('profile', 'a')
    expect(form.input['firstName']).toBe('Marko')
    form.reset()
    expect(form.input).toEqual({ firstName: 'Ana', address: {} })
  })

  it('calls no source for the values the form started with', async () => {
    const { calls, source } = handSource()
    const sources = createSchemaBuilder({ extensions: [prefill({ profiles: source })] })
    const form = openForm(sources, sourceForm({ default: 'a' }))
    form.run.start()
    calls[0]?.settle.resolve(profiles.a)
    await form.run.settled()
    form.type('profile', 'b')
    calls[1]?.settle.resolve(profiles.b)
    await form.run.settled()

    form.reset()
    expect(calls).toHaveLength(2)
    expect(form.run.state.pending).toEqual([])
    expect(form.input).toMatchObject({ profile: 'a', firstName: 'Marko' })
    form.type('profile', 'b')
    calls[2]?.settle.resolve(profiles.b)
    await form.run.settled()
    expect(form.input).toMatchObject({ firstName: 'Jelena', address: { city: 'Novi Sad' } })
  })

  it('calls a source again whose values the form never started with', async () => {
    const { calls, source } = handSource()
    const sources = createSchemaBuilder({ extensions: [prefill({ profiles: source })] })
    const form = openForm(sources, sourceForm({ default: 'a' }))
    form.run.start()
    form.type('profile', 'b')
    calls[1]?.settle.resolve(profiles.b)
    await form.run.settled()

    form.reset()
    expect(calls.map(({ value }) => value)).toEqual(['a', 'b', 'a'])
    calls[2]?.settle.resolve(profiles.a)
    await form.run.settled()
    expect(form.input).toMatchObject({ firstName: 'Marko', address: { city: 'Beograd' } })
  })
})

describe('chains', () => {
  /** A country fills a city, and the profile fills the country and a name. */
  const chain = (profile: Prefill, country: Prefill): JsonForm =>
    ({
      version: '1',
      fields: [
        { name: 'city', type: 'text' },
        { name: 'country', type: 'text', prefill: country },
        { name: 'profile', type: 'text', default: 'a', prefill: profile },
        { name: 'name', type: 'text' },
      ],
    }) as never

  it('run the fill of a trigger another fill sets, the one before it first', () => {
    const json = chain(
      { map: { a: { country: 'RS', name: 'Marko' }, b: { country: 'ME', name: 'Jelena' } } },
      { map: { RS: { city: 'Beograd' }, ME: { city: 'Podgorica' } } },
    )
    expect(builder.getInitialInput(json)).toEqual({
      profile: 'a',
      country: 'RS',
      city: 'Beograd',
      name: 'Marko',
    })
    for (const watchSync of [false, true]) {
      const form = openForm(builder, json, { watchSync })
      form.type('profile', 'b')
      expect(form.input).toMatchObject({ country: 'ME', city: 'Podgorica' })
      form.type('profile', '')
      expect(form.input).toEqual({ profile: '' })
    }
  })

  it('run sources in the same phase, and settle together', async () => {
    const values = vi.fn()
    const sources = createSchemaBuilder({
      extensions: [
        prefill({
          profiles: async (value) => {
            values(value)
            return value === 'a' ? { country: 'RS', name: 'Marko' } : {}
          },
          countries: async (value) => {
            values(value)
            return { city: value === 'RS' ? 'Beograd' : 'Podgorica' }
          },
        }),
      ],
    })
    const json = chain(
      { source: 'profiles', fields: ['country', 'name'] },
      { source: 'countries', fields: ['city'] },
    )
    for (const watchSync of [false, true]) {
      const form = openForm(sources, json, { watchSync })
      form.run.start()
      await form.run.settled()
      expect(form.log).toEqual(['start country "RS"', 'start name "Marko"', 'start city "Beograd"'])
      form.type('country', 'ME')
      await form.run.settled()
      expect(form.input['city']).toBe('Podgorica')
      // The country the user chose stays, so its city does too.
      form.type('profile', 'b')
      await form.run.settled()
      expect(form.input).toEqual({ profile: 'b', country: 'ME', city: 'Podgorica' })
    }
    expect(values).toHaveBeenCalledTimes(8)
  })

  it('run a source the form starts with once, when a fill before it sets its trigger', () => {
    const values = vi.fn((value: unknown) => (value === 'a' ? { country: 'ME' } : { city: value }))
    const sources = createSchemaBuilder({
      extensions: [prefill({ profiles: values, countries: values })],
    })
    const json = chain(
      { source: 'profiles', fields: ['country'] },
      { source: 'countries', fields: ['city'] },
    )
    const withCountry = {
      ...json,
      fields: json.fields.map((field) =>
        field.name === 'country' ? { ...field, default: 'RS' } : field,
      ),
    }
    const form = openForm(sources, withCountry)
    form.run.start()
    expect(values.mock.calls.map(([value]) => value)).toEqual(['a', 'ME'])
    expect(form.input).toMatchObject({ country: 'ME', city: 'ME' })
  })

  it('blank the fields of a trigger that loses its value as the form starts, but not the ones the app gives', async () => {
    const sources = createSchemaBuilder({
      extensions: [
        prefill({ profiles: async () => ({}), countries: async () => ({ city: 'Niš' }) }),
      ],
    })
    const json = chain(
      { source: 'profiles', fields: ['country'] },
      { source: 'countries', fields: ['city', 'name'] },
    )
    const form = openForm(sources, json, { given: { country: 'RS', name: 'Ana' } })
    form.run.start()
    await form.run.settled()
    expect(form.input).toEqual({ profile: 'a', country: 'RS', name: 'Ana' })
    const fresh = openForm(sources, {
      ...json,
      fields: json.fields.map((field) =>
        field.name === 'country' ? { ...field, default: 'RS' } : field,
      ),
    })
    fresh.type('city', 'Niš')
    fresh.run.start()
    await fresh.run.settled()
    expect(fresh.log).toEqual(['start country undefined', 'start city undefined'])
  })
})
