import type { FieldComponents } from '@whatsaaaa/form-builder-vue'
import CheckboxInput from './CheckboxInput.vue'
import TextInput from './TextInput.vue'

export const components: FieldComponents = {
  text: TextInput,
  email: TextInput,
  password: TextInput,
  checkbox: CheckboxInput,
}
