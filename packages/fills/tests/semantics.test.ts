import {
  createSchemaBuilder,
  type FillErrorInfo,
  type FillTriggerValue,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import { type FillSourceContext, fills } from '@whatsaaaa/form-builder-fills'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { builder, fixtures, form, openForm } from './helpers'

/** A promise to settle by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}

/** The errors a form reports, as `trigger=value field: message`. */
function errorsOf() {
  const errors: string[] = []
  const onError = (error: unknown, info: FillErrorInfo) => {
    const field = info.field === undefined ? '' : ` ${info.field}`
    errors.push(`${info.trigger}=${String(info.value)}${field}: ${(error as Error).message}`)
  }
  return { errors, onError }
}

describe('a map', () => {
  const json = fixtures['profile-map']

  it('fills a new form with the values of the default, as it starts', () => {
    expect(builder.getInitialInput(json)).toEqual({
      profile: 'a',
      firstName: 'Marko',
      lastName: 'Petrović',
      address: { city: 'Beograd' },
    })
  })

  it('sets the fields for each new value, and blanks those an entry gives null', () => {
    const open = openForm(builder, json)
    open.type('profile', 'b')
    expect(open.input).toEqual({
      profile: 'b',
      firstName: 'Jelena',
      lastName: 'Jovanović',
      address: { city: 'Novi Sad' },
    })
    open.type('profile', 'c')
    expect(open.input).toMatchObject({ firstName: 'Nikola', address: { city: undefined } })
  })

  it('blanks every field for a value with no entry', () => {
    const open = openForm(builder, json)
    open.type('profile', 'other')
    expect(open.input).toEqual({
      profile: 'other',
      firstName: undefined,
      lastName: undefined,
      address: { city: undefined },
    })
  })

  it('keeps what the user edited, unless it overwrites always', () => {
    const open = openForm(builder, json)
    open.type('firstName', 'Marta')
    open.type('profile', 'b')
    expect(open.input).toMatchObject({ firstName: 'Marta', lastName: 'Jovanović' })

    const always = form(
      ...json.fields.map((field) =>
        field.name === 'profile'
          ? { ...field, fills: { ...(field['fills'] as object), overwrite: 'always' } }
          : field,
      ),
    )
    const forced = openForm(builder, always)
    forced.type('firstName', 'Marta')
    forced.type('profile', 'b')
    expect(forced.input).toMatchObject({ firstName: 'Jelena', lastName: 'Jovanović' })
  })

  it('blanks every field it sets when the profile is cleared, edited or not', () => {
    const open = openForm(builder, json)
    open.type('firstName', 'Marta')
    open.type('profile', undefined)
    expect(open.input).toEqual({
      profile: undefined,
      firstName: undefined,
      lastName: undefined,
      address: { city: undefined },
    })
  })

  it("fills nothing as a saved record starts, and keeps the record's values", () => {
    const record = { profile: 'b', firstName: 'Ana', lastName: 'Ilić' }
    expect(
      builder.getFills(json).initialInput({ ...record, address: { city: 'Kragujevac' } }, record),
    ).toEqual({ ...record, address: { city: 'Kragujevac' } })
  })

  it('looks up number and boolean values by the key JSON writes', () => {
    const json = form(
      {
        name: 'seats',
        type: 'select',
        options: [
          { value: 1, label: 'One' },
          { value: 2, label: 'Two' },
        ],
        fills: { map: { '2': { note: 'A pair' } } },
      } as never,
      {
        name: 'company',
        type: 'checkbox',
        fills: { map: { true: { note: 'Invoice' }, false: { note: 'Receipt' } } },
      } as never,
      { name: 'note', type: 'text' },
    )
    const open = openForm(builder, json)
    open.type('seats', 2)
    expect(open.input['note']).toBe('A pair')
    open.type('company', false)
    expect(open.input['note']).toBe('Receipt')
    open.type('company', true)
    expect(open.input['note']).toBe('Invoice')
  })

  it('finds no entry for a key of Object.prototype', () => {
    const json = form(
      { name: 'code', type: 'text', fills: { map: { a: { note: 'A' } } } } as never,
      { name: 'note', type: 'text' },
    )
    const open = openForm(builder, json)
    open.type('code', 'a')
    open.type('code', 'constructor')
    expect(open.input['note']).toBeUndefined()
  })
})

describe('a source', () => {
  /** A builder whose source `profiles` records each call, and answers when the test says. */
  function withSource() {
    const calls: { value: FillTriggerValue; context: FillSourceContext }[] = []
    const answers: ReturnType<typeof deferred<Record<string, unknown> | null>>[] = []
    const profiles = (value: FillTriggerValue, context: FillSourceContext) => {
      calls.push({ value, context })
      const answer = deferred<Record<string, unknown> | null>()
      answers.push(answer)
      return answer.promise
    }
    const cities = () => null
    return {
      calls,
      answers,
      builder: createSchemaBuilder({ extensions: [fills({ sources: { profiles, cities } })] }),
    }
  }

  const json = fixtures['profile-source']

  it('gets the value, the trigger, the fields as written, the input and a signal', () => {
    const { calls, builder } = withSource()
    const open = openForm(builder, json)
    open.type('profile', 'a')
    expect(calls).toHaveLength(1)
    const [{ value, context }] = calls as [(typeof calls)[number]]
    expect(value).toBe('a')
    expect(context.trigger).toBe('profile')
    expect(context.fields).toEqual(['firstName', 'lastName', 'email', 'address.city'])
    expect(context.input).toMatchObject({ profile: 'a' })
    expect(context.signal.aborted).toBe(false)
  })

  it('sets the fields once its values come, fitted to each field, and shows them pending until then', async () => {
    const { answers, builder } = withSource()
    const { errors, onError } = errorsOf()
    const open = openForm(builder, json, { onError })
    open.type('profile', 'a')
    expect(open.run.state.pending).toEqual(['profile'])
    expect(open.run.state.isPending(['address', 'city'])).toBe(true)
    answers[0]?.resolve({
      firstName: 'Marko',
      lastName: 'Petrović',
      email: 'marko',
      'address.city': 11000,
      id: 7,
    })
    await open.run.settled()
    expect(open.run.state.pending).toEqual([])
    expect(open.input).toMatchObject({
      firstName: 'Marko',
      lastName: 'Petrović',
      email: 'marko',
      address: { city: '11000' },
    })
    expect(errors).toEqual([])
  })

  it('applies only the newest value, and aborts the call before it', async () => {
    const { calls, answers, builder } = withSource()
    const open = openForm(builder, json)
    open.type('profile', 'a')
    open.type('profile', 'b')
    expect(calls[0]?.context.signal.aborted).toBe(true)
    answers[1]?.resolve({ firstName: 'Jelena' })
    answers[0]?.resolve({ firstName: 'Marko' })
    await open.run.settled()
    expect(open.input['firstName']).toBe('Jelena')
  })

  it('passes what it throws or rejects with to onError, with the trigger and its value', async () => {
    const { answers, builder } = withSource()
    const { errors, onError } = errorsOf()
    const open = openForm(builder, json, { onError })
    open.type('profile', 'a')
    answers[0]?.reject(new Error('Profile a: HTTP 500'))
    await open.run.settled()
    expect(errors).toEqual(['profile=a: Profile a: HTTP 500'])
  })

  it('reports a TypeError when the extension has no such source, as on a server', () => {
    const server = createSchemaBuilder({ extensions: [fills()] })
    const { errors, onError } = errorsOf()
    const open = openForm(server, json, { onError })
    open.type('profile', 'a')
    expect(errors).toEqual([
      'profile=a: No source "profiles" for the fills of "profile". Give it to fills({ sources })',
    ])
    expect(open.input['firstName']).toBeUndefined()
  })

  it('runs as the form starts only from the default, as start values', async () => {
    const { calls, answers, builder } = withSource()
    const json: JsonForm = {
      ...fixtures['profile-source'],
      fields: fixtures['profile-source'].fields.map((field) =>
        field.name === 'profile' ? { ...field, default: 'a' } : field,
      ),
    }
    const open = openForm(builder, json)
    expect(calls).toEqual([])
    open.run.start()
    answers[0]?.resolve({ firstName: 'Marko' })
    await open.run.settled()
    expect(open.log).toContain('start firstName "Marko"')

    const saved = withSource()
    const record = openForm(saved.builder, json, { given: { profile: 'a' } })
    record.run.start()
    expect(saved.calls).toEqual([])
  })
})

describe('the server', () => {
  it('builds the schema a definition without fills builds', () => {
    const json = fixtures['profile-map']
    const server = createSchemaBuilder({ extensions: [fills()] })
    const schema = server.build(json)
    expect(schema.type).toBe('object')
    expect('pipe' in schema).toBe(false)
    const input = {
      profile: 'a',
      firstName: '',
      lastName: 'Petrović',
      address: { city: 'Beograd' },
    }
    expect(v.safeParse(schema, input).issues?.map((issue) => issue.message)).toEqual(['Required'])
  })
})
