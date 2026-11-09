import { expect } from 'vitest'
import type { FixtureName } from './fixtures'

/** Where a field's value is, as a dot path: `'address.city'` or `'lines.0.product'`. */
export type DotPath = string

/** Something a person does in the form. The bindings' tests do each on their own elements. */
export type Step =
  /** Types `text` into the field, replacing what it had. */
  | { do: 'fill'; path: DotPath; text: string }
  /** Clicks the checkbox, or the radio button or checkbox labelled `option`. */
  | { do: 'check'; path: DotPath; option?: string }
  /** Picks the options with these labels in the field's select, and nothing else. */
  | { do: 'choose'; path: DotPath; options: string[] }
  /** Picks these files in the field's file input. */
  | { do: 'upload'; path: DotPath; files: FileSpec[] }
  /** Adds an item to the list. */
  | { do: 'add'; path: DotPath }
  /** Removes the item at `index` from the list. */
  | { do: 'remove'; path: DotPath; index: number }
  /** Goes to the next step of the layout, or the one before. */
  | { do: 'next' }
  | { do: 'back' }
  | { do: 'submit' }

export interface FileSpec {
  name: string
  type: string
  size: number
}

export interface Scenario {
  fixture: FixtureName
  name: string
  steps: Step[]
  /** Every error the form shows at the end, by the field's path. None when left out. */
  errors?: Record<DotPath, string>
  /** What the form submitted. When left out, it must not have submitted. */
  output?: Record<string, unknown>
  /** The text some fields hold at the end, by path, e.g. an item's default. */
  values?: Record<DotPath, string>
  /** Every field on show at the end, in order: those of the current step. */
  shown?: DotPath[]
  /** The span of the row cell some fields are in, by path. */
  spans?: Record<DotPath, number>
  /** The slots on show at the end, in order. */
  slots?: string[]
}

const fill = (path: DotPath, text: string): Step => ({ do: 'fill', path, text })
const check = (path: DotPath, option?: string): Step => ({ do: 'check', path, option })
const choose = (path: DotPath, ...options: string[]): Step => ({ do: 'choose', path, options })
const upload = (path: DotPath, ...files: [name: string, type: string, size: number][]): Step => ({
  do: 'upload',
  path,
  files: files.map(([name, type, size]) => ({ name, type, size })),
})
const add = (path: DotPath): Step => ({ do: 'add', path })
const remove = (path: DotPath, index: number): Step => ({ do: 'remove', path, index })
const submit: Step = { do: 'submit' }
const next: Step = { do: 'next' }
const back: Step = { do: 'back' }

/** A file the form submitted, picked with `upload`. */
const uploaded = (name: string) => expect.objectContaining({ name })

const MiB = 1024 * 1024

/**
 * Every fixture, filled in the way a person would, with what the form must show and submit. A
 * value Formisch can't read from the element, like a number, is set the way each binding's docs
 * show.
 */
export const scenarios: Scenario[] = [
  { fixture: 'text', name: 'empty', steps: [submit], errors: { fullName: 'Required' } },
  {
    fixture: 'text',
    name: 'too short after trim',
    steps: [fill('fullName', '  A  '), submit],
    errors: { fullName: 'At least 2 characters' },
  },
  {
    fixture: 'text',
    name: 'only spaces',
    steps: [fill('fullName', '   '), submit],
    errors: { fullName: 'Required' },
  },
  {
    fixture: 'text',
    name: 'valid, trimmed',
    steps: [fill('fullName', '  Ana  '), submit],
    output: { fullName: 'Ana' },
  },
  {
    fixture: 'text',
    name: 'revalidates on input',
    steps: [submit, fill('fullName', 'Ana')],
  },

  { fixture: 'textarea', name: 'empty and optional', steps: [submit], output: {} },
  {
    fixture: 'textarea',
    name: 'too long',
    steps: [fill('message', 'x'.repeat(501)), submit],
    errors: { message: '500 characters at most' },
  },
  {
    fixture: 'textarea',
    name: 'valid',
    steps: [fill('message', 'Hello'), submit],
    output: { message: 'Hello' },
  },

  { fixture: 'email', name: 'empty', steps: [submit], errors: { email: 'Required' } },
  {
    fixture: 'email',
    name: 'invalid',
    steps: [fill('email', 'nope'), submit],
    errors: { email: 'Invalid email: Received "nope"' },
  },
  {
    fixture: 'email',
    name: 'valid',
    steps: [fill('email', ' ana@example.com '), submit],
    output: { email: 'ana@example.com' },
  },

  {
    fixture: 'password',
    name: 'too short',
    steps: [fill('password', 'short'), submit],
    errors: { password: 'At least 10 characters' },
  },
  {
    fixture: 'password',
    name: 'valid',
    steps: [fill('password', 'longenough1'), submit],
    output: { password: 'longenough1' },
  },

  {
    fixture: 'url',
    name: 'invalid',
    steps: [fill('website', 'notaurl'), submit],
    errors: { website: 'Invalid URL: Received "notaurl"' },
  },
  {
    fixture: 'url',
    name: 'valid',
    steps: [fill('website', 'https://example.com'), submit],
    output: { website: 'https://example.com' },
  },
  { fixture: 'url', name: 'empty and optional', steps: [submit], output: {} },
  {
    fixture: 'url',
    name: 'cleared',
    steps: [fill('website', 'https://example.com'), fill('website', ''), submit],
    output: { website: undefined },
  },

  {
    fixture: 'tel',
    name: 'invalid',
    steps: [fill('phone', 'abc'), submit],
    errors: { phone: 'Digits, spaces and + only' },
  },
  {
    fixture: 'tel',
    name: 'valid',
    steps: [fill('phone', '+381 64 123 4567'), submit],
    output: { phone: '+381 64 123 4567' },
  },

  {
    fixture: 'number',
    name: 'below the minimum',
    steps: [fill('age', '15'), submit],
    errors: { age: '16 or older' },
  },
  {
    fixture: 'number',
    name: 'not an integer',
    steps: [fill('age', '16.5'), submit],
    errors: { age: 'Whole years' },
  },
  { fixture: 'number', name: 'valid', steps: [fill('age', '30'), submit], output: { age: 30 } },
  {
    fixture: 'number',
    name: 'cleared',
    steps: [fill('age', '30'), fill('age', ''), submit],
    output: { age: undefined },
  },

  {
    fixture: 'checkbox',
    name: 'unticked',
    steps: [submit],
    errors: { terms: 'Please accept the terms' },
  },
  { fixture: 'checkbox', name: 'ticked', steps: [check('terms'), submit], output: { terms: true } },
  {
    fixture: 'checkbox',
    name: 'ticked, then unticked',
    steps: [check('terms'), check('terms'), submit],
    errors: { terms: 'Please accept the terms' },
  },

  {
    fixture: 'date',
    name: 'after the maximum',
    steps: [fill('birthday', '2026-05-01'), submit],
    errors: { birthday: 'Before 2026' },
  },
  {
    // The day picked, at midnight where the person is, like a datetime without a time zone.
    fixture: 'date',
    name: 'valid, as a Date',
    steps: [fill('birthday', '2000-01-15'), submit],
    output: { birthday: new Date(2000, 0, 15) },
  },
  {
    fixture: 'time',
    name: 'too early',
    steps: [fill('callTime', '08:00'), submit],
    errors: { callTime: 'From 09:00' },
  },
  {
    fixture: 'time',
    name: 'too late',
    steps: [fill('callTime', '18:00'), submit],
    errors: { callTime: 'Until 17:00' },
  },
  {
    fixture: 'time',
    name: 'valid',
    steps: [fill('callTime', '10:30'), submit],
    output: { callTime: '10:30' },
  },
  { fixture: 'datetime', name: 'empty', steps: [submit], errors: { appointment: 'Required' } },
  {
    fixture: 'datetime',
    name: 'before the minimum',
    steps: [fill('appointment', '2025-06-01T10:00'), submit],
    errors: { appointment: 'From 2026 on' },
  },
  {
    fixture: 'datetime',
    name: 'valid',
    steps: [fill('appointment', '2026-03-01T10:00'), submit],
    output: { appointment: '2026-03-01T10:00' },
  },

  { fixture: 'select', name: 'empty', steps: [submit], errors: { country: 'Required' } },
  {
    fixture: 'select',
    name: 'valid, with a number option',
    steps: [choose('country', 'Serbia'), choose('seats', 'Two'), fill('city', 'Belgrade'), submit],
    output: { country: 'rs', seats: 2, city: 'Belgrade' },
  },
  {
    fixture: 'radio',
    name: 'empty',
    steps: [submit],
    errors: { newsletter: 'Required' },
  },
  {
    fixture: 'radio',
    name: 'false is an answer',
    steps: [check('newsletter', 'No'), check('contactBy', 'Phone'), submit],
    output: { newsletter: false, contactBy: 'phone' },
  },
  {
    fixture: 'multiselect',
    name: 'empty',
    steps: [submit],
    errors: { toppings: 'Required' },
  },
  {
    fixture: 'multiselect',
    name: 'only one',
    steps: [check('toppings', 'Cheese'), submit],
    errors: { toppings: 'Pick at least two' },
  },
  {
    fixture: 'multiselect',
    name: 'valid',
    steps: [
      check('toppings', 'Cheese'),
      check('toppings', 'Ham'),
      choose('weekdays', 'Monday', 'Wednesday'),
      submit,
    ],
    output: { toppings: ['cheese', 'ham'], weekdays: [1, 3] },
  },
  {
    fixture: 'multiselect',
    name: 'unticked again',
    steps: [
      check('toppings', 'Cheese'),
      check('toppings', 'Ham'),
      check('toppings', 'Cheese'),
      submit,
    ],
    errors: { toppings: 'Pick at least two' },
  },

  {
    fixture: 'file',
    name: 'wrong MIME type',
    steps: [upload('avatar', ['notes.txt', 'text/plain', 10]), submit],
    errors: {
      avatar: 'Invalid MIME type: Expected ("image/png" | "image/jpeg") but received "text/plain"',
    },
  },
  {
    fixture: 'file',
    name: 'too big',
    steps: [upload('avatar', ['big.png', 'image/png', 2 * MiB]), submit],
    errors: { avatar: '1 MiB at most' },
  },
  {
    fixture: 'file',
    name: 'too many',
    steps: [
      upload(
        'attachments',
        ['1.pdf', 'application/pdf', 10],
        ['2.pdf', 'application/pdf', 10],
        ['3.pdf', 'application/pdf', 10],
        ['4.pdf', 'application/pdf', 10],
      ),
      submit,
    ],
    errors: { attachments: '3 files at most' },
  },
  {
    fixture: 'file',
    name: 'one of many too big',
    steps: [
      upload(
        'attachments',
        ['1.pdf', 'application/pdf', 10],
        ['huge.pdf', 'application/pdf', 6 * MiB],
      ),
      submit,
    ],
    errors: { attachments: '5 MiB per file at most' },
  },
  {
    fixture: 'file',
    name: 'valid',
    steps: [
      upload('avatar', ['a.png', 'image/png', 1000]),
      upload('attachments', ['1.pdf', 'application/pdf', 10], ['2.pdf', 'application/pdf', 20]),
      submit,
    ],
    output: { avatar: uploaded('a.png'), attachments: [uploaded('1.pdf'), uploaded('2.pdf')] },
  },
  { fixture: 'file', name: 'empty and optional', steps: [submit], output: {} },

  {
    fixture: 'group',
    name: 'empty',
    steps: [submit],
    errors: { 'address.street': 'Required', 'address.city': 'Required' },
  },
  {
    fixture: 'group',
    name: 'bad ZIP code',
    steps: [
      fill('address.street', 'Main 1'),
      fill('address.city', 'Novi Sad'),
      fill('address.zip', '12a'),
      submit,
    ],
    errors: { 'address.zip': 'Digits only' },
  },
  {
    fixture: 'group',
    name: 'valid, with a default',
    steps: [
      fill('address.street', 'Main 1'),
      fill('address.city', 'Novi Sad'),
      fill('address.zip', '21000'),
      submit,
    ],
    output: { address: { street: 'Main 1', city: 'Novi Sad', zip: '21000', country: 'rs' } },
  },

  {
    fixture: 'array',
    name: 'no lines',
    steps: [submit],
    errors: { lines: 'Add at least one product' },
  },
  {
    fixture: 'array',
    name: "a new line's defaults, and its required field",
    steps: [add('lines'), submit],
    errors: { 'lines.0.product': 'Required' },
    values: { 'lines.0.quantity': '1' },
  },
  {
    fixture: 'array',
    name: 'a line that is not an integer',
    steps: [add('lines'), fill('lines.0.product', 'Pen'), fill('lines.0.quantity', '1.5'), submit],
    errors: { 'lines.0.quantity': 'Whole numbers only' },
  },
  {
    fixture: 'array',
    name: 'too many tags',
    steps: [
      ...[1, 2, 3, 4, 5].flatMap((i) => [add('tags'), fill(`tags.${i}`, `t${i}`)]),
      add('lines'),
      fill('lines.0.product', 'Pen'),
      submit,
    ],
    errors: { tags: 'At most 5 tags' },
  },
  {
    fixture: 'array',
    name: 'an empty tag',
    steps: [add('tags'), add('lines'), fill('lines.0.product', 'Pen'), submit],
    errors: { 'tags.1': 'Required' },
  },
  {
    fixture: 'array',
    name: 'valid',
    steps: [
      fill('tags.0', '  new  '),
      add('lines'),
      fill('lines.0.product', 'Pen'),
      fill('lines.0.quantity', '2'),
      submit,
    ],
    output: { tags: ['new'], lines: [{ product: 'Pen', quantity: 2 }] },
  },
  {
    fixture: 'array',
    name: 'removing a line keeps the others',
    steps: [
      add('lines'),
      fill('lines.0.product', 'First'),
      add('lines'),
      fill('lines.1.product', 'Second'),
      fill('lines.1.quantity', '3'),
      remove('lines', 0),
      submit,
    ],
    output: { tags: ['new'], lines: [{ product: 'Second', quantity: 3 }] },
  },

  { fixture: 'heading', name: 'submits nothing', steps: [submit], output: {} },
  { fixture: 'paragraph', name: 'submits nothing', steps: [submit], output: {} },
  { fixture: 'divider', name: 'submits nothing', steps: [submit], output: {} },

  {
    // A form rule only runs when the fields it reads are valid.
    fixture: 'form-rules/sign-up',
    name: 'a short password shows only its own error',
    steps: [
      fill('username', 'ana'),
      fill('password', 'ana'),
      fill('confirmPassword', 'anb'),
      submit,
    ],
    errors: { password: 'At least 10 characters' },
  },
  {
    fixture: 'form-rules/sign-up',
    name: 'the password is the username',
    steps: [
      fill('username', ' Ana-Maria-1 '),
      fill('password', 'ana-maria-1'),
      fill('confirmPassword', 'ana-maria-1'),
      submit,
    ],
    errors: { password: "Don't use your username as the password" },
  },
  {
    fixture: 'form-rules/sign-up',
    name: 'the passwords differ',
    steps: [
      fill('username', 'ana'),
      fill('password', 'longenough1'),
      fill('confirmPassword', 'longenough2'),
      submit,
    ],
    errors: { confirmPassword: 'Passwords differ' },
  },
  {
    fixture: 'form-rules/sign-up',
    name: 'valid and normalized',
    steps: [
      fill('username', ' Ana '),
      fill('password', 'longenough1'),
      fill('confirmPassword', 'longenough1'),
      fill('age', '200'),
      submit,
    ],
    output: { username: 'ana', password: 'longenough1', confirmPassword: 'longenough1', age: 120 },
  },
  {
    fixture: 'form-rules/order',
    name: 'no lines',
    steps: [submit],
    errors: { lines: 'Add at least one line' },
  },
  {
    fixture: 'form-rules/order',
    name: 'the dates are the wrong way round',
    steps: [
      fill('deliverFrom', '2026-12-10'),
      fill('deliverBy', '2026-12-01'),
      add('lines'),
      fill('lines.0.product', 'Pen'),
      fill('lines.0.quantity', '2'),
      submit,
    ],
    errors: { deliverBy: "Can't be before the first day" },
  },
  {
    fixture: 'form-rules/order',
    name: "a rule on a line's fields",
    steps: [
      add('lines'),
      fill('lines.0.product', 'Pen'),
      fill('lines.0.quantity', '5'),
      add('lines'),
      fill('lines.1.product', 'Ink'),
      fill('lines.1.quantity', '2'),
      fill('lines.1.giftWrapped', '3'),
      submit,
    ],
    errors: { 'lines.1.giftWrapped': "Can't wrap more than you order" },
  },
  {
    fixture: 'form-rules/order',
    name: 'valid',
    steps: [
      fill('deliverFrom', '2026-12-01'),
      fill('deliverBy', '2026-12-10'),
      add('lines'),
      fill('lines.0.product', 'Pen'),
      fill('lines.0.quantity', '5'),
      fill('lines.0.giftWrapped', '2'),
      submit,
    ],
    output: {
      deliverFrom: '2026-12-01',
      deliverBy: '2026-12-10',
      lines: [{ product: 'Pen', quantity: 5, giftWrapped: 2 }],
    },
  },
  {
    fixture: 'form-rules/shipping',
    name: 'the ZIP codes differ',
    steps: [fill('billing.zip', '21000'), fill('shipping.zip', '11000'), submit],
    errors: { 'shipping.zip': 'We only ship to the billing ZIP' },
  },
  {
    fixture: 'form-rules/shipping',
    name: 'valid',
    steps: [fill('billing.zip', '21000'), fill('shipping.zip', '21000'), submit],
    output: { billing: { zip: '21000' }, shipping: { zip: '21000' } },
  },

  {
    fixture: 'layout/checkout',
    name: 'lays the fields out on a 12-column grid, with sections and slots',
    steps: [],
    shown: [
      'name',
      'email',
      'address.street',
      'address.city',
      'address.zip',
      'coupon',
      'newsletter',
      'acceptTerms',
    ],
    spans: {
      name: 6,
      email: 6,
      'address.street': 8,
      'address.city': 8,
      'address.zip': 4,
      coupon: 4,
      acceptTerms: 4,
    },
    slots: ['shipping', 'submit'],
  },
  {
    fixture: 'layout/checkout',
    name: "lays out each item of a list with the list's items",
    steps: [add('lines')],
    spans: { 'lines.0.product': 9, 'lines.0.quantity': 3 },
    values: { 'lines.0.quantity': '1' },
  },
  {
    fixture: 'layout/checkout',
    name: 'shows the issues of every field, wherever it is',
    steps: [submit],
    errors: {
      name: 'Required',
      email: 'Required',
      'address.street': 'Required',
      'address.city': 'Required',
      lines: 'Add at least one product',
      acceptTerms: 'Please accept the terms',
    },
  },
  {
    fixture: 'layout/checkout',
    name: 'submits the value the fields give, whatever the layout',
    steps: [
      fill('name', 'Ana'),
      fill('email', 'ana@example.com'),
      fill('address.street', 'Main 1'),
      fill('address.city', 'Graz'),
      add('lines'),
      fill('lines.0.product', 'Pen'),
      fill('coupon', ' save10 '),
      check('acceptTerms'),
      submit,
    ],
    output: {
      name: 'Ana',
      email: 'ana@example.com',
      address: { street: 'Main 1', city: 'Graz' },
      lines: [{ product: 'Pen', quantity: 1 }],
      coupon: 'SAVE10',
      acceptTerms: true,
    },
  },

  {
    fixture: 'layout/sign-up',
    name: 'Next on an empty first step stays on it',
    steps: [next],
    shown: ['email', 'password', 'confirmPassword'],
    errors: { email: 'Required', password: 'Required', confirmPassword: 'Required' },
  },
  {
    fixture: 'layout/sign-up',
    name: 'a form rule keeps the user on the step its field is on',
    steps: [
      fill('email', 'ana@example.com'),
      fill('password', 'longenough1'),
      fill('confirmPassword', 'longenough2'),
      next,
    ],
    shown: ['email', 'password', 'confirmPassword'],
    errors: { confirmPassword: 'Passwords differ' },
  },
  {
    fixture: 'layout/sign-up',
    name: 'the next step starts clean, on its grid',
    steps: [
      fill('email', 'ana@example.com'),
      fill('password', 'longenough1'),
      fill('confirmPassword', 'longenough1'),
      next,
    ],
    shown: ['firstName', 'lastName', 'birthDate', 'address.city', 'address.zip'],
    spans: { firstName: 6, lastName: 6, 'address.city': 8, 'address.zip': 4 },
  },
  {
    fixture: 'layout/sign-up',
    name: 'Next on the second step shows its own issues',
    steps: [
      fill('email', 'ana@example.com'),
      fill('password', 'longenough1'),
      fill('confirmPassword', 'longenough1'),
      next,
      fill('address.zip', '80a'),
      next,
    ],
    errors: { firstName: 'Required', lastName: 'Required', 'address.zip': 'Digits only' },
  },
  {
    fixture: 'layout/sign-up',
    name: 'Back keeps what each step holds',
    steps: [
      fill('email', 'ana@example.com'),
      fill('password', 'longenough1'),
      fill('confirmPassword', 'longenough1'),
      next,
      fill('firstName', 'Ana'),
      back,
    ],
    shown: ['email', 'password', 'confirmPassword'],
    values: { email: 'ana@example.com', password: 'longenough1' },
  },
  {
    fixture: 'layout/sign-up',
    name: 'Next again shows the step as the user left it',
    steps: [
      fill('email', 'ana@example.com'),
      fill('password', 'longenough1'),
      fill('confirmPassword', 'longenough1'),
      next,
      fill('firstName', 'Ana'),
      back,
      next,
    ],
    shown: ['firstName', 'lastName', 'birthDate', 'address.city', 'address.zip'],
    values: { firstName: 'Ana' },
  },
  {
    fixture: 'layout/sign-up',
    name: "the last step's own issue stops the submit",
    steps: [
      fill('email', 'ana@example.com'),
      fill('password', 'longenough1'),
      fill('confirmPassword', 'longenough1'),
      next,
      fill('firstName', 'Ana'),
      fill('lastName', 'Horvat'),
      next,
      submit,
    ],
    shown: ['topics', 'acceptTerms'],
    errors: { acceptTerms: 'Please accept the terms' },
  },
  {
    fixture: 'layout/sign-up',
    name: 'submits the whole form from the last step',
    steps: [
      fill('email', 'ana@example.com'),
      fill('password', 'longenough1'),
      fill('confirmPassword', 'longenough1'),
      next,
      fill('firstName', 'Ana'),
      fill('lastName', 'Horvat'),
      fill('address.city', 'Graz'),
      fill('address.zip', '8010'),
      next,
      check('topics', 'News'),
      check('acceptTerms'),
      submit,
    ],
    output: {
      email: 'ana@example.com',
      password: 'longenough1',
      confirmPassword: 'longenough1',
      firstName: 'Ana',
      lastName: 'Horvat',
      address: { city: 'Graz', zip: '8010' },
      topics: ['news'],
      acceptTerms: true,
    },
  },

  {
    fixture: 'layout/order',
    name: 'Next on a list without items shows its own issue',
    steps: [fill('customer', 'Ana'), next, next],
    shown: [],
    errors: { lines: 'Add at least one product' },
  },
  {
    fixture: 'layout/order',
    name: "Next shows the issues of a new item's fields, laid out",
    steps: [fill('customer', 'Ana'), next, add('lines'), next],
    errors: { 'lines.0.product': 'Required' },
    spans: { 'lines.0.product': 9, 'lines.0.quantity': 3 },
  },
  {
    fixture: 'layout/order',
    name: 'the last step starts clean',
    steps: [fill('customer', 'Ana'), next, add('lines'), fill('lines.0.product', 'Pen'), next],
    shown: ['deliverBy', 'note'],
  },
  {
    fixture: 'layout/order',
    name: 'submits the items of a list from another step',
    steps: [
      fill('customer', 'Ana'),
      next,
      add('lines'),
      fill('lines.0.product', 'Pen'),
      fill('lines.0.quantity', '3'),
      next,
      fill('deliverBy', '2026-12-01'),
      submit,
    ],
    output: { customer: 'Ana', lines: [{ product: 'Pen', quantity: 3 }], deliverBy: '2026-12-01' },
  },
]
