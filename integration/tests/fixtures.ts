import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import text from '../../fixtures/field-types/text.json'
import textarea from '../../fixtures/field-types/textarea.json'
import email from '../../fixtures/field-types/email.json'
import password from '../../fixtures/field-types/password.json'
import url from '../../fixtures/field-types/url.json'
import tel from '../../fixtures/field-types/tel.json'
import number from '../../fixtures/field-types/number.json'
import checkbox from '../../fixtures/field-types/checkbox.json'
import date from '../../fixtures/field-types/date.json'
import time from '../../fixtures/field-types/time.json'
import datetime from '../../fixtures/field-types/datetime.json'
import select from '../../fixtures/field-types/select.json'
import radio from '../../fixtures/field-types/radio.json'
import multiselect from '../../fixtures/field-types/multiselect.json'
import file from '../../fixtures/field-types/file.json'
import heading from '../../fixtures/field-types/heading.json'
import paragraph from '../../fixtures/field-types/paragraph.json'
import divider from '../../fixtures/field-types/divider.json'
import group from '../../fixtures/field-types/group.json'
import array from '../../fixtures/field-types/array.json'
import signUp from '../../fixtures/form-rules/sign-up.json'
import order from '../../fixtures/form-rules/order.json'
import shipping from '../../fixtures/form-rules/shipping.json'
import checkout from '../../fixtures/layout/checkout.json'
import layoutOrder from '../../fixtures/layout/order.json'
import layoutSignUp from '../../fixtures/layout/sign-up.json'
import affectsBusiness from '../../fixtures/affects/business.json'
import affectsOrder from '../../fixtures/affects/order.json'
import affectsShipping from '../../fixtures/affects/shipping.json'
import affectsSignUp from '../../fixtures/affects/sign-up.json'

const all = {
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
  'form-rules/sign-up': signUp,
  'form-rules/order': order,
  'form-rules/shipping': shipping,
  'layout/checkout': checkout,
  'layout/sign-up': layoutSignUp,
  'layout/order': layoutOrder,
  'affects/business': affectsBusiness,
  'affects/shipping': affectsShipping,
  'affects/order': affectsOrder,
  'affects/sign-up': affectsSignUp,
}

export type FixtureName = keyof typeof all

/**
 * Every shared fixture: one per built-in type, the ones with form rules, the ones with a layout,
 * and the ones with the conditions of the affects package, which every binding renders with a
 * builder that has `affects()`. TypeScript reads `version` in a JSON file as any string, so they
 * are cast once here.
 */
export const fixtures = all as unknown as Record<FixtureName, JsonForm>
