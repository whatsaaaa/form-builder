import type { JsonForm } from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'
// #region builder
import { affects } from '@whatsaaaa/form-builder-affects'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'

const builder = createSchemaBuilder({ extensions: [affects()] })
// #endregion builder

const definition: JsonForm = {
  version: '1',
  fields: [
    {
      name: 'accountType',
      type: 'radio',
      required: true,
      options: [
        { value: 'personal', label: 'Personal' },
        { value: 'business', label: 'Business' },
      ],
    },
    {
      name: 'vatId',
      type: 'text',
      required: true,
      affects: [
        {
          effect: 'hideAndClear',
          when: { field: 'accountType', notEquals: 'business' },
        },
      ],
    },
  ],
}

// #region parse
const schema = builder.build(definition)

const personal = v.parse(schema, { accountType: 'personal' }) // { accountType: 'personal' }
const business = v.safeParse(schema, { accountType: 'business' }) // fails: vatId is required
// #endregion parse

// #region visibility
const visibility = builder.getVisibility(definition)

// The form's input now, e.g. Formisch's getInput(form).
const input = { accountType: 'personal', vatId: 'DE123456789' }
const state = visibility.of(input) // the same object until what is hidden changes

const [vatId] = builder
  .getFieldTree(definition)
  .filter((node) => node.field.name === 'vatId')
state.isHidden(vatId!, []) // true
const { toClear } = state // [{ path: ['vatId'], input: undefined }]: set it with Formisch's setInput
// #endregion visibility

if (!state.isHidden(vatId!, [])) throw new Error('vatId should be hidden')
if (toClear.length !== 1) throw new Error('vatId should be cleared')
if (personal.accountType !== 'personal' || business.success)
  throw new Error('Unexpected output')
