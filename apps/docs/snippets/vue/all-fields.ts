import type { FieldComponents } from '@whatsaaaa/form-builder-vue'
import CheckboxGroup from './CheckboxGroup.vue'
import CheckboxInput from './CheckboxInput.vue'
import GroupFieldset from './GroupFieldset.vue'
import FileInput from './FileInput.vue'
import FormHeading from './FormHeading.vue'
import ListRepeater from './ListRepeater.vue'
import RadioInput from './RadioInput.vue'
import SelectInput from './SelectInput.vue'
import TextareaInput from './TextareaInput.vue'
import TextInput from './TextInput.vue'

export const components: FieldComponents = {
  text: TextInput,
  email: TextInput,
  password: TextInput,
  number: TextInput,
  textarea: TextareaInput,
  checkbox: CheckboxInput,
  select: SelectInput,
  radio: RadioInput,
  multiselect: CheckboxGroup,
  file: FileInput,
  group: GroupFieldset,
  array: ListRepeater,
  heading: FormHeading,
  // ...one for every type your definitions use
}
