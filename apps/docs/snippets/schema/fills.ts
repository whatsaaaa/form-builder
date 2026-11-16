// #region builder
import { fills } from '@whatsaaaa/form-builder-fills'
import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'
import { profiles } from './profiles'

export const builder = createSchemaBuilder({
  extensions: [fills({ sources: { profiles } })],
})

// On a server that only validates, no source runs, so none is needed.
export const serverBuilder = createSchemaBuilder({ extensions: [fills()] })
// #endregion builder

// #region define
const definition = builder.defineForm({
  version: '1',
  fields: [
    {
      name: 'profile',
      type: 'select',
      label: 'Profile',
      options: [
        { value: 'a', label: 'Profile A' },
        { value: 'b', label: 'Profile B' },
      ],
      // `source` is typed as one of the builder's sources: here "profiles".
      fills: {
        source: 'profiles',
        fields: ['firstName', 'lastName', 'address.city'],
      },
    },
    { name: 'firstName', type: 'text', label: 'First name' },
    { name: 'lastName', type: 'text', label: 'Last name' },
    {
      name: 'address',
      type: 'group',
      label: 'Address',
      fields: [{ name: 'city', type: 'text', label: 'City' }],
    },
  ],
})
// #endregion define

if (!builder.validate(definition).success) {
  throw new Error('The definition has issues')
}
