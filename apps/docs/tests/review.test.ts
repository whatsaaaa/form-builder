// The review recipe of the multi-step page, on a definition with every shape it walks: a section,
// a row, a group, lists of objects and of single values, choices, a file and a hidden field.
import { affects } from '@whatsaaaa/form-builder-affects'
import { createSchemaBuilder, type JsonForm } from '@whatsaaaa/form-builder-schema'
import { describe, expect, it } from 'vitest'
import { reviewOf } from '../snippets/schema/review'

const builder = createSchemaBuilder({ extensions: [affects()] })

const definition: JsonForm = {
  version: '1',
  fields: [
    { name: 'email', type: 'email', label: 'Email', required: true },
    { name: 'password', type: 'password', label: 'Password', required: true },
    { name: 'newsletter', type: 'checkbox', label: 'Send me the newsletter' },
    {
      name: 'account',
      type: 'radio',
      label: 'Account',
      options: [
        { value: 'personal', label: 'Personal' },
        { value: 'business', label: 'Business' },
      ],
    },
    {
      name: 'company',
      type: 'text',
      label: 'Company',
      affects: [{ effect: 'show', when: { field: 'account', equals: 'business' } }],
    },
    {
      name: 'address',
      type: 'group',
      label: 'Address',
      fields: [
        { name: 'city', type: 'text', label: 'City' },
        { name: 'zip', type: 'text' },
      ],
    },
    {
      name: 'days',
      type: 'multiselect',
      label: 'Days',
      options: [
        { value: 1, label: 'Friday' },
        { value: 2, label: 'Saturday' },
        { value: 3, label: 'Sunday' },
      ],
    },
    {
      name: 'guests',
      type: 'array',
      label: 'Guest',
      fields: [
        { name: 'name', type: 'text', label: 'Name' },
        { name: 'age', type: 'number', label: 'Age' },
      ],
    },
    { name: 'tags', type: 'array', label: 'Tag', of: { type: 'text' } },
    { name: 'photo', type: 'file', label: 'Photo' },
    { name: 'note', type: 'textarea', label: 'Note' },
  ],
  layout: {
    steps: [
      { id: 'account', label: 'Account', items: ['email', 'password', 'newsletter'] },
      {
        id: 'details',
        label: 'Details',
        items: [
          { type: 'heading', id: 'intro', text: 'About you' },
          { type: 'section', label: 'Who', items: ['account', 'company'] },
          { field: 'address', items: [{ type: 'row', items: ['city', 'zip'] }] },
          '*',
        ],
      },
      { id: 'confirm', label: 'Check your answers', items: [{ type: 'slot', name: 'review' }] },
    ],
  },
}

const input = {
  email: 'milica@example.com',
  password: 'correct horse battery',
  account: 'personal',
  company: 'Left over from before',
  address: { city: 'Beograd', zip: '' },
  days: [1, 3],
  guests: [{ name: 'Nikola', age: 34 }, { name: 'Jelena' }],
  tags: ['vegetarian'],
  photo: new File(['x'], 'milica.jpg', { type: 'image/jpeg' }),
}

const layout = builder.getLayout(definition)
const review = (step: number, value: unknown = input) =>
  reviewOf(layout.steps[step]!, value, builder.getVisibility(definition).of(value)).map(
    (row) => `${row.key} | ${row.label} | ${row.value}`,
  )

describe('reviewOf', () => {
  it('passes validate()', () => {
    expect(builder.validate(definition).issues).toEqual([])
  })

  it('gives each answer of a step as text, and never a password', () => {
    expect(review(0)).toEqual([
      'email | Email | milica@example.com',
      'password | Password | ••••••••',
      'newsletter | Send me the newsletter | No',
    ])
  })

  it('walks sections, rows, groups and lists in layout order, without hidden fields', () => {
    expect(review(1)).toEqual([
      'account | Account | Personal',
      'address.city | City | Beograd',
      'address.zip | zip | Not answered',
      'days | Days | Friday, Sunday',
      'guests.0.name | Guest 1: Name | Nikola',
      'guests.0.age | Guest 1: Age | 34',
      'guests.1.name | Guest 2: Name | Jelena',
      'guests.1.age | Guest 2: Age | Not answered',
      'tags.0 | Tag 1 | vegetarian',
      'photo | Photo | milica.jpg',
      'note | Note | Not answered',
    ])
  })

  it('shows a field once its conditions show it', () => {
    expect(review(1, { ...input, account: 'business' })).toContain(
      'company | Company | Left over from before',
    )
  })

  it('has no rows for a step with only a slot', () => {
    expect(review(2)).toEqual([])
  })
})
