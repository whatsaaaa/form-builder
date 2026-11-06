import type { FieldComponents } from '@whatsaaaa/form-builder-vue'
import './fields.css'
import FieldCheckbox from './FieldCheckbox.vue'
import FieldDivider from './FieldDivider.vue'
import FieldFile from './FieldFile.vue'
import FieldGroup from './FieldGroup.vue'
import FieldHeading from './FieldHeading.vue'
import FieldList from './FieldList.vue'
import FieldMultiselect from './FieldMultiselect.vue'
import FieldParagraph from './FieldParagraph.vue'
import FieldRadio from './FieldRadio.vue'
import FieldSelect from './FieldSelect.vue'
import FieldText from './FieldText.vue'
import FieldTextarea from './FieldTextarea.vue'

/** The playground's component for each built-in field type. */
export const fieldComponents: FieldComponents = {
  text: FieldText,
  email: FieldText,
  password: FieldText,
  url: FieldText,
  tel: FieldText,
  number: FieldText,
  date: FieldText,
  time: FieldText,
  datetime: FieldText,
  textarea: FieldTextarea,
  checkbox: FieldCheckbox,
  select: FieldSelect,
  radio: FieldRadio,
  multiselect: FieldMultiselect,
  file: FieldFile,
  group: FieldGroup,
  array: FieldList,
  heading: FieldHeading,
  paragraph: FieldParagraph,
  divider: FieldDivider,
}
