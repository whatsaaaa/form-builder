import { findField, type JsonField, type JsonForm } from '@whatsaaaa/form-builder-schema'
import { describe, expect, it } from 'vitest'
import { builder, form, outputOf } from './helpers'

const fields: JsonField[] = [
  { name: 'name', type: 'text' },
  { name: 'age', type: 'number' },
  { name: 'agree', type: 'checkbox' },
  { name: 'when', type: 'date' },
  {
    name: 'size',
    type: 'select',
    options: [
      { value: 1, label: 'S' },
      { value: 2, label: 'M' },
    ],
  },
  {
    name: 'topics',
    type: 'multiselect',
    options: [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ],
  },
  { name: 'tags', type: 'array', of: { type: 'number' } },
]

/** Whether a field shown by `when` shows, for `input`. */
function shows(when: unknown, input: Record<string, unknown>): boolean {
  const json = form(...fields, {
    name: 'x',
    type: 'text',
    affects: [{ effect: 'show', when }],
  } as JsonField)
  const state = builder.getVisibility(json).of(input)
  return !state.isHidden(findField(builder.getFieldTree(json), 'x'), [])
}

describe('a test', () => {
  it('compares the input, turned the way a renderer sets it', () => {
    expect(shows({ field: 'age', equals: 5 }, { age: 5 })).toBe(true)
    expect(shows({ field: 'age', equals: 5 }, { age: '5' })).toBe(true)
    expect(shows({ field: 'size', in: [2] }, { size: '2' })).toBe(true)
    expect(shows({ field: 'when', equals: '2026-11-09' }, { when: '2026-11-09' })).toBe(true)
    expect(shows({ field: 'name', notEquals: 'a' }, { name: 'b' })).toBe(true)
    expect(shows({ field: 'name', notEquals: 'a' }, { name: 'a' })).toBe(false)
  })

  it("doesn't trim or otherwise normalize the input", () => {
    expect(shows({ field: 'name', equals: 'a' }, { name: ' a' })).toBe(false)
  })

  it('finds a value among the items of a multiselect or a list', () => {
    expect(shows({ field: 'topics', includes: 'b' }, { topics: ['a', 'b'] })).toBe(true)
    expect(shows({ field: 'topics', includes: 'b' }, { topics: ['a'] })).toBe(false)
    expect(shows({ field: 'tags', includes: 2 }, { tags: ['1', '2'] })).toBe(true)
  })

  it('reads an empty field as empty, which equals nothing and is unequal to anything', () => {
    for (const empty of [undefined, '', null]) {
      expect(shows({ field: 'name', empty: true }, { name: empty })).toBe(true)
      expect(shows({ field: 'name', notEmpty: true }, { name: empty })).toBe(false)
      expect(shows({ field: 'name', equals: 'a' }, { name: empty })).toBe(false)
      expect(shows({ field: 'name', notEquals: 'a' }, { name: empty })).toBe(true)
      expect(shows({ field: 'name', in: ['a'] }, { name: empty })).toBe(false)
    }
    expect(shows({ field: 'age', empty: true }, { age: '' })).toBe(true)
    expect(shows({ field: 'topics', empty: true }, { topics: [] })).toBe(true)
    expect(shows({ field: 'topics', includes: 'a' }, { topics: undefined })).toBe(false)
  })

  it('reads a checkbox nobody ticked as empty, not as false', () => {
    expect(shows({ field: 'agree', equals: false }, { agree: undefined })).toBe(false)
    expect(shows({ field: 'agree', notEquals: true }, { agree: undefined })).toBe(true)
    expect(shows({ field: 'agree', equals: false }, { agree: false })).toBe(true)
  })

  it('joins tests with all and any', () => {
    const both = {
      all: [
        { field: 'name', equals: 'a' },
        { field: 'age', equals: 1 },
      ],
    }
    const either = {
      any: [
        { field: 'name', equals: 'a' },
        { field: 'age', equals: 1 },
      ],
    }
    expect(shows(both, { name: 'a', age: 1 })).toBe(true)
    expect(shows(both, { name: 'a', age: 2 })).toBe(false)
    expect(shows(either, { name: 'b', age: 1 })).toBe(true)
    expect(shows(either, { name: 'b', age: 2 })).toBe(false)
  })
})

describe('the effects of a field', () => {
  const json = (...affects: object[]): JsonForm =>
    form({ name: 'a', type: 'checkbox' }, { name: 'b', type: 'checkbox' }, {
      name: 'x',
      type: 'number',
      required: true,
      affects,
    } as JsonField)
  const isHidden = (definition: JsonForm, input: object) =>
    builder
      .getVisibility(definition)
      .of(input)
      .isHidden(findField(builder.getFieldTree(definition), 'x'), [])

  it('let hide win over show', () => {
    const both = json(
      { effect: 'show', when: { field: 'a', equals: true } },
      { effect: 'hide', when: { field: 'b', equals: true } },
    )
    expect(isHidden(both, { a: true, b: false })).toBe(false)
    expect(isHidden(both, { a: true, b: true })).toBe(true)
    expect(isHidden(both, { a: false, b: false })).toBe(true)
  })

  it('keep the value of a field an unmet show hides, like a plain hide', () => {
    const shown = json({ effect: 'show', when: { field: 'a', equals: true } })
    expect(outputOf(shown, { a: false, b: false, x: 4 })).toEqual({ a: false, b: false, x: 4 })
  })

  it('clear only with hideAndClear', () => {
    const cleared = json(
      { effect: 'show', when: { field: 'a', equals: true } },
      { effect: 'hideAndClear', when: { field: 'b', equals: true } },
    )
    expect(outputOf(cleared, { a: false, b: false, x: 4 })).toEqual({ a: false, b: false, x: 4 })
    expect(outputOf(cleared, { a: true, b: true, x: 4 })).toEqual({
      a: true,
      b: true,
      x: undefined,
    })
  })
})
