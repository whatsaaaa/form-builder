import { describe, expect, it } from 'vitest'
import { defaultFieldTypes, type FieldTypeDef } from '@whatsaaaa/form-builder-schema'

describe('field type meta', () => {
  it.each(Object.entries(defaultFieldTypes))('%s has a label', (_, type: FieldTypeDef) => {
    expect(type.meta?.label).toEqual(expect.any(String))
  })
})
