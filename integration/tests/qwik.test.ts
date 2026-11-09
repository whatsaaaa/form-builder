// The form store Formisch for Qwik makes from a built schema, field by field. Every binding makes
// its store this way, but only Qwik's rejects `v.lazy`. examples/qwik renders the forms.
import { createFormStore, getFieldInput, getFieldStore } from '@formisch/qwik/internals'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'
import { describe, expect, it } from 'vitest'
import { type FixtureName, fixtures } from './fixtures'

const builder = createSchemaBuilder()

function createStore(name: FixtureName) {
  const json = fixtures[name]
  const schema = builder.build(json)
  const initialInput = builder.getInitialInput(json)
  return createFormStore({ schema, initialInput }, (input) => v.safeParseAsync(schema, input))
}

/** The kind of store Formisch must make for a field of `kind`, to read and set its value. */
const storeKind = (kind: string | undefined) =>
  kind === 'array' || kind === 'object' ? kind : 'value'

describe('the form store of Formisch for Qwik', () => {
  it.each(Object.keys(fixtures) as FixtureName[])('is made from the %s fixture', (name) => {
    expect(() => createStore(name)).not.toThrow()
  })

  // Formisch would start a required string field with '' if it weren't inside optional.
  it.each(Object.keys(fixtures) as FixtureName[])(
    'starts with the initial input of the %s fixture',
    (name) => {
      expect(getFieldInput(createStore(name))).toEqual(builder.getInitialInput(fixtures[name]))
    },
  )

  it.each(Object.keys(fixtures) as FixtureName[])(
    'has a store of the right kind for each field of the %s fixture',
    (name) => {
      const store = createStore(name)
      // The fields of a list's items have '*' in their path, and no store until an item exists.
      const fields = [...builder.walkFields(fixtures[name])].filter(
        (field) => field.kind !== 'none' && !field.dataPath.includes('*'),
      )

      const kinds = fields.map((field) => [
        field.dataPath.join('.'),
        getFieldStore(store, field.dataPath)?.kind,
      ])
      expect(kinds).toEqual(
        fields.map((field) => [field.dataPath.join('.'), storeKind(field.kind)]),
      )
    },
  )
})
