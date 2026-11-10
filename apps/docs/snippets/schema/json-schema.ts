// #region make
import {
  createSchemaBuilder,
  defineFieldType,
} from '@whatsaaaa/form-builder-schema'
import { toJsonSchema } from '@whatsaaaa/form-builder-schema/json-schema'
import * as v from 'valibot'

const money = defineFieldType({
  kind: 'number',
  props: v.object({ currency: v.picklist(['EUR', 'USD']) }),
  schema: () => v.number(),
  meta: { label: 'Money', description: 'An amount in one currency' },
})

const builder = createSchemaBuilder({ fieldTypes: { money } })
const schema = toJsonSchema(builder)

// Write it next to your definitions, e.g. with Node's writeFileSync.
const file = JSON.stringify(schema, null, 2)
// #endregion make

if (!file.includes('"type.money"'))
  throw new Error('The JSON Schema has no money type')
