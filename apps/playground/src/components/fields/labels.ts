import type { JsonField } from '@whatsaaaa/form-builder-schema'

/** The field's label, or else its name as words: `discountPercent` -> `Discount percent`. */
export function labelOf(field: JsonField): string {
  if (field.label) return field.label
  const words = (field.name ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}
