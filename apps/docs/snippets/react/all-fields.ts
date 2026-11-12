import type { FieldComponents } from '@whatsaaaa/form-builder-react'
import { CheckboxGroup } from './CheckboxGroup'
import { CheckboxInput } from './CheckboxInput'
import { GroupFieldset } from './GroupFieldset'
import { FileInput } from './FileInput'
import { FormHeading } from './FormHeading'
import { ListRepeater } from './ListRepeater'
import { RadioInput } from './RadioInput'
import { SelectInput } from './SelectInput'
import { TextareaInput } from './TextareaInput'
import { TextInput } from './TextInput'

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
