import * as v from 'valibot'
import { eachItem } from '../shared/each-item'
import { defineFieldType } from './define-field-type'

type MimeType = `${string}/${string}`

const mimeTypes = (accept: string) => accept.split(',').map((type) => type.trim()) as MimeType[]

const fileProps = v.object({
  multiple: v.optional(v.boolean()),
  // A File only carries its MIME type, so extensions (.pdf) and wildcards (image/*) can't be
  // checked against it.
  accept: v.optional(
    v.pipe(
      v.string(),
      v.check(
        (input) => mimeTypes(input).every((type) => /^[\w.+-]+\/[\w.+-]+$/.test(type)),
        'Use MIME types separated by commas, such as image/png,image/jpeg',
      ),
    ),
  ),
})

/**
 * A File, or an array of them with `multiple`. Rules for files, like `maxSize`, run on each one;
 * rules for arrays, like `maxLength`, limit the count.
 */
export const fileType = defineFieldType({
  kind: (field) => (field.multiple ? 'array' : 'file'),
  itemKind: 'file',
  props: fileProps,
  // The schema is created per field and v.file() only reads the File global while parsing, so
  // the package still loads where File doesn't exist.
  schema: (field) => {
    const file = field.accept ? v.pipe(v.file(), v.mimeType(mimeTypes(field.accept))) : v.file()
    if (!field.multiple) return file
    // Checking each file after the array keeps the issues on the field, not on its items.
    return field.accept ? v.pipe(v.array(v.file()), eachItem(file)) : v.array(file)
  },
})
