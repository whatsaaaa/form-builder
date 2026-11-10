import {
  createSchemaBuilder,
  type JsonForm,
} from '@whatsaaaa/form-builder-schema'
import * as v from 'valibot'

const builder = createSchemaBuilder()
const json: JsonForm = {
  version: '1',
  fields: [
    { name: 'email', type: 'email', required: true },
    {
      name: 'address',
      type: 'group',
      fields: [{ name: 'city', type: 'text' }],
    },
  ],
}

// #region typed
interface SignUpInput {
  email: string
  address: { city?: string }
}

const schema = builder.build<SignUpInput>(json)

const output = v.parse(schema, { email: 'jane@example.com', address: {} })
const city = output.address.city // string | undefined
// #endregion typed

if (city !== undefined) throw new Error('No city was given')
