import { describe, expect, it } from 'vitest'
import {
  createSchemaBuilder,
  defaultFieldTypes,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import text from '../../../../fixtures/field-types/text.json'
import textarea from '../../../../fixtures/field-types/textarea.json'
import email from '../../../../fixtures/field-types/email.json'
import password from '../../../../fixtures/field-types/password.json'
import url from '../../../../fixtures/field-types/url.json'
import tel from '../../../../fixtures/field-types/tel.json'
import number from '../../../../fixtures/field-types/number.json'
import checkbox from '../../../../fixtures/field-types/checkbox.json'
import date from '../../../../fixtures/field-types/date.json'
import time from '../../../../fixtures/field-types/time.json'
import datetime from '../../../../fixtures/field-types/datetime.json'
import select from '../../../../fixtures/field-types/select.json'
import radio from '../../../../fixtures/field-types/radio.json'
import multiselect from '../../../../fixtures/field-types/multiselect.json'
import file from '../../../../fixtures/field-types/file.json'
import heading from '../../../../fixtures/field-types/heading.json'
import paragraph from '../../../../fixtures/field-types/paragraph.json'
import divider from '../../../../fixtures/field-types/divider.json'
import group from '../../../../fixtures/field-types/group.json'
import array from '../../../../fixtures/field-types/array.json'

// The shared fixtures, one per built-in type. The Vue adapter renders the same files.
type Fixture = { fields: readonly { type: string }[] }

const fixtures: Record<string, Fixture> = {
  text,
  textarea,
  email,
  password,
  url,
  tel,
  number,
  checkbox,
  date,
  time,
  datetime,
  select,
  radio,
  multiselect,
  file,
  heading,
  paragraph,
  divider,
  group,
  array,
}

const { build, validate } = createSchemaBuilder()

describe('fixtures', () => {
  it('has one fixture per built-in type', () => {
    expect(Object.keys(fixtures)).toEqual(Object.keys(defaultFieldTypes))
  })

  it.each(Object.entries(fixtures))(
    '%s is valid and uses its type',
    (type: string, json: Fixture) => {
      expect(validate(json).issues).toEqual([])
      expect(() => build(json as JsonForm)).not.toThrow()
      expect(json.fields.map((field) => field.type)).toContain(type)
    },
  )
})
