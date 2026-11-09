import { describe, expect, it } from 'vitest'
import { isRequired } from '@whatsaaaa/form-builder-schema'

describe('isRequired', () => {
  it('is true for required: true, and for required with or without a message', () => {
    expect(isRequired({ type: 'text', required: true })).toBe(true)
    expect(isRequired({ type: 'text', required: { message: 'Email please' } })).toBe(true)
    expect(isRequired({ type: 'text', required: {} })).toBe(true)
  })

  it('is false for required: false, and for a field without required', () => {
    expect(isRequired({ type: 'text', required: false })).toBe(false)
    expect(isRequired({ type: 'text' })).toBe(false)
    expect(isRequired({ type: 'heading', text: 'Hi' })).toBe(false)
  })
})
