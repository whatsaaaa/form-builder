import type { FieldComponents } from '@whatsaaaa/form-builder-vue'
import CheckboxInput from './CheckboxInput.vue'
import GroupFieldset from './GroupFieldset.vue'
import FileInput from './FileInput.vue'
import FormHeading from './FormHeading.vue'
import ListRepeater from './ListRepeater.vue'
import SelectInput from './SelectInput.vue'
import TextInput from './TextInput.vue'

export const components: FieldComponents = {
  text: TextInput,
  email: TextInput,
  number: TextInput,
  checkbox: CheckboxInput,
  select: SelectInput,
  radio: SelectInput,
  file: FileInput,
  group: GroupFieldset,
  array: ListRepeater,
  heading: FormHeading,
  // ...one for every type your definitions use
}
