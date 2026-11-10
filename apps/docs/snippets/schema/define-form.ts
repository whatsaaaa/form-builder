// #region define
import {
  createSchemaBuilder,
  defineFieldType,
} from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'

const money = defineFieldType({
  kind: 'number',
  props: v.object({ currency: v.picklist(['EUR', 'USD']) }),
  schema: () => v.number(),
})

const { defineForm, build } = createSchemaBuilder({ fieldTypes: { money } })

const form = defineForm({
  version: '1',
  fields: [
    {
      name: 'email',
      type: 'email',
      rules: [{ rule: 'maxLength', value: 120 }],
    },
    { name: 'price', type: 'money', currency: 'EUR' }, // currency is typed by money's props
  ],
})

const schema = build(form)
// #endregion define

// #region errors
defineForm({
  version: '1',
  fields: [
    // @ts-expect-error: 'emial' is no registered type
    { name: 'email', type: 'emial' },
  ],
})
defineForm({
  version: '1',
  fields: [
    {
      name: 'email',
      type: 'email',
      // @ts-expect-error: the value of maxLength is a number
      rules: [{ rule: 'maxLength', value: '120' }],
    },
  ],
})
// #endregion errors

v.parse(schema, { email: 'jane@example.com', price: 10 })
