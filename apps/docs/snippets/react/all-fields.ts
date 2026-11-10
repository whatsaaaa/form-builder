import type { FieldComponents } from '@whatsaaaa/form-builder-react'
import { CheckboxInput } from './CheckboxInput'
import { GroupFieldset } from './GroupFieldset'
import { FileInput } from './FileInput'
import { FormHeading } from './FormHeading'
import { ListRepeater } from './ListRepeater'
import { SelectInput } from './SelectInput'
import { TextInput } from './TextInput'

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
