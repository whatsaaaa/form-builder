import type { FieldComponents } from '@whatsaaaa/form-builder-react'
import { CheckboxInput } from './CheckboxInput'
import { TextInput } from './TextInput'

export const components: FieldComponents = {
  text: TextInput,
  email: TextInput,
  password: TextInput,
  checkbox: CheckboxInput,
}
