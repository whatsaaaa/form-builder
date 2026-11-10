import {
  createSchemaBuilder,
  defineFormRule,
  defineRule,
} from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'

// #region rule
const even = defineRule({
  kinds: ['number'],
  meta: { label: 'Even number', category: 'number' },
  create: (_, message) =>
    v.check((input: number) => input % 2 === 0, message),
})

const builder = createSchemaBuilder({ rules: { even } })
// #endregion rule

// #region params
const atLeast = defineRule({
  kinds: ['number', 'date'],
  // A number on a number field, an ISO string on a date field.
  params: (kind) =>
    v.object({ value: kind === 'date' ? v.string() : v.number() }),
  meta: { label: 'At least', category: 'comparison' },
  create: (params, message) => v.minValue(params.value, message),
})
// #endregion params

// #region normalize
const collapseSpaces = defineRule({
  kinds: ['string'],
  stage: 'normalize',
  meta: { label: 'Collapse spaces', category: 'normalize' },
  create: () => v.transform((input: string) => input.replace(/\s+/g, ' ')),
})
// #endregion normalize

// #region form-rule
const sameZip = defineFormRule({
  params: v.object({ others: v.array(v.string()) }),
  reads: (params) => params.others,
  kinds: ['string'],
  // The value of `field`, then the values of the paths `reads` gives.
  check: (values) => new Set(values).size === 1,
  meta: { label: 'Same ZIP', category: 'comparison' },
})

const withFormRule = createSchemaBuilder({ formRules: { sameZip } })
// #endregion form-rule

const all = createSchemaBuilder({
  rules: { even, atLeast, collapseSpaces },
  formRules: { sameZip },
})
const schema = all.build({
  version: '1',
  fields: [
    {
      name: 'seats',
      type: 'number',
      rules: [{ rule: 'even' }, { rule: 'atLeast', value: 2 }],
    },
    { name: 'name', type: 'text', rules: [{ rule: 'collapseSpaces' }] },
    { name: 'billingZip', type: 'text' },
    { name: 'shippingZip', type: 'text' },
  ],
  formRules: [
    {
      rule: 'sameZip',
      field: 'shippingZip',
      others: ['billingZip'],
      message: 'Use the same ZIP',
    },
  ],
})
const output = v.parse(schema, {
  seats: 4,
  name: 'Jane   Doe',
  billingZip: '1000',
  shippingZip: '1000',
})
if (output['name'] !== 'Jane Doe')
  throw new Error('collapseSpaces did not run')
if (v.safeParse(schema, { seats: 3 }).success)
  throw new Error('even did not run')
if (v.safeParse(schema, { billingZip: '1', shippingZip: '2' }).success)
  throw new Error('sameZip')
if (!builder.rules.even || !withFormRule.formRules.sameZip)
  throw new Error('Not registered')
