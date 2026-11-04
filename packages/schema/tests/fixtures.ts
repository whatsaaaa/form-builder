import text from '../../../fixtures/field-types/text.json'
import textarea from '../../../fixtures/field-types/textarea.json'
import email from '../../../fixtures/field-types/email.json'
import password from '../../../fixtures/field-types/password.json'
import url from '../../../fixtures/field-types/url.json'
import tel from '../../../fixtures/field-types/tel.json'
import number from '../../../fixtures/field-types/number.json'
import checkbox from '../../../fixtures/field-types/checkbox.json'
import date from '../../../fixtures/field-types/date.json'
import time from '../../../fixtures/field-types/time.json'
import datetime from '../../../fixtures/field-types/datetime.json'
import select from '../../../fixtures/field-types/select.json'
import radio from '../../../fixtures/field-types/radio.json'
import multiselect from '../../../fixtures/field-types/multiselect.json'
import file from '../../../fixtures/field-types/file.json'
import heading from '../../../fixtures/field-types/heading.json'
import paragraph from '../../../fixtures/field-types/paragraph.json'
import divider from '../../../fixtures/field-types/divider.json'
import group from '../../../fixtures/field-types/group.json'
import array from '../../../fixtures/field-types/array.json'

/** A fixture as TypeScript reads its JSON file, where `version` is any string. */
export type Fixture = { fields: readonly { type: string }[] }

/** The shared fixtures, one per built-in type. The Vue adapter renders the same files. */
export const fixtures: Record<string, Fixture> = {
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
