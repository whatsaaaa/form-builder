<script setup lang="ts">
import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import FormExample from '../components/FormExample.vue'
import array from '../../../../fixtures/field-types/array.json'
import checkbox from '../../../../fixtures/field-types/checkbox.json'
import date from '../../../../fixtures/field-types/date.json'
import datetime from '../../../../fixtures/field-types/datetime.json'
import divider from '../../../../fixtures/field-types/divider.json'
import email from '../../../../fixtures/field-types/email.json'
import file from '../../../../fixtures/field-types/file.json'
import group from '../../../../fixtures/field-types/group.json'
import heading from '../../../../fixtures/field-types/heading.json'
import multiselect from '../../../../fixtures/field-types/multiselect.json'
import number from '../../../../fixtures/field-types/number.json'
import paragraph from '../../../../fixtures/field-types/paragraph.json'
import password from '../../../../fixtures/field-types/password.json'
import radio from '../../../../fixtures/field-types/radio.json'
import select from '../../../../fixtures/field-types/select.json'
import tel from '../../../../fixtures/field-types/tel.json'
import text from '../../../../fixtures/field-types/text.json'
import textarea from '../../../../fixtures/field-types/textarea.json'
import time from '../../../../fixtures/field-types/time.json'
import url from '../../../../fixtures/field-types/url.json'

// Every built-in type in one form, from the fixtures the tests use.
const fixtures = [
  heading,
  paragraph,
  text,
  textarea,
  email,
  password,
  url,
  tel,
  number,
  checkbox,
  divider,
  date,
  time,
  datetime,
  select,
  radio,
  multiselect,
  file,
  group,
  array,
]

const definition = {
  version: '1',
  fields: fixtures.flatMap((fixture) => fixture.fields),
} as JsonForm
</script>

<template>
  <FormExample :definition="definition" />
</template>
