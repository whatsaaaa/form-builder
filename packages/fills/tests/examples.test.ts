import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { fills } from '@whatsaaaa/form-builder-fills'
import { describe, expect, it } from 'vitest'
import { definitionIssues, fixtures, openForm, sources } from './helpers'

describe('the fixtures', () => {
  it.each(Object.entries(fixtures))('%s has no issues', (_, json) => {
    expect(definitionIssues(json)).toEqual([])
  })

  it('are unknown keys for a builder without fills', () => {
    expect(createSchemaBuilder().validate(fixtures['profile-source']).issues).toEqual([
      expect.objectContaining({ code: 'unknown_key', path: ['fields', 0, 'fills'] }),
      expect.objectContaining({ code: 'unknown_key', path: ['fields', 1, 'fills'] }),
    ])
  })
})

describe('the fills of two fields that set the same one', () => {
  it('set it from whichever value came last', () => {
    const open = openForm(
      createSchemaBuilder({ extensions: [fills({ sources })] }),
      fixtures['profile-source'],
    )
    open.type('profile', 'a')
    expect(open.input).toMatchObject({ firstName: 'Marko', address: { city: 'Beograd' } })
    open.type('zip', '21000')
    expect(open.input).toMatchObject({ firstName: 'Marko', address: { city: undefined } })
    open.type('zip', '11000')
    expect(open.input).toMatchObject({ address: { city: 'Beograd' } })
  })
})
