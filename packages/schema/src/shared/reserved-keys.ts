// Every list here is frozen within a major version: a name added in a minor would break the apps
// whose own field types, props or extensions already use it. New reserved names only come in a
// major.

/** Field keys this package reads. */
const FIELD_KEYS = [
  'name',
  'type',
  'label',
  'description',
  'placeholder',
  'default',
  'required',
  'rules',
  'ui',
] as const

/**
 * Field keys kept for later versions. No field can have them yet, and no field type's props or
 * extension's keys can use them, so a minor version can give them a meaning.
 */
const FUTURE_FIELD_KEYS = ['id', 'disabled', 'readonly', 'hidden', 'help', 'meta'] as const

/**
 * Field keys this package owns: those it reads, and those it keeps for later versions. A field
 * type's props and an extension's keys can't use them.
 */
export const RESERVED_FIELD_KEYS = [...FIELD_KEYS, ...FUTURE_FIELD_KEYS] as const

/**
 * Layout node types this package owns: `section`, `row` and `slot`, and those it keeps for later
 * versions. A display element's type can't have one of these names, so one written in a layout
 * never takes the place of a layout node. Other field types can, as they are never written there.
 */
export const RESERVED_LAYOUT_TYPES = [
  'section',
  'row',
  'slot',
  'tabs',
  'tab',
  'columns',
  'column',
  'fieldset',
] as const

/**
 * The keys of a layout's steps and sections. An extension's layout props can't use them. Also
 * frozen within a major, like the reserved field keys.
 */
export const RESERVED_LAYOUT_KEYS = [
  'type',
  'id',
  'label',
  'description',
  'items',
  'ui',
  'span',
  'field',
  'name',
] as const

/**
 * Rule keys this package owns. A rule's params can't use them.
 */
export const RESERVED_RULE_KEYS = ['rule', 'message'] as const

/**
 * Form rule keys this package owns. A form rule's params can't use them.
 */
export const RESERVED_FORM_RULE_KEYS = ['rule', 'field', 'message'] as const

/**
 * Names a field with a value can't have. Form rule paths read the items of a list with `*`, and
 * no object can hold a `__proto__` key.
 */
export const RESERVED_NAMES = ['*', '__proto__'] as const

const fieldKeys: ReadonlySet<string> = new Set(RESERVED_FIELD_KEYS)
const futureFieldKeys: ReadonlySet<string> = new Set(FUTURE_FIELD_KEYS)
const layoutTypes: ReadonlySet<string> = new Set(RESERVED_LAYOUT_TYPES)
const layoutKeys: ReadonlySet<string> = new Set(RESERVED_LAYOUT_KEYS)
const ruleKeys: ReadonlySet<string> = new Set(RESERVED_RULE_KEYS)
const formRuleKeys: ReadonlySet<string> = new Set(RESERVED_FORM_RULE_KEYS)
const names: ReadonlySet<string> = new Set(RESERVED_NAMES)

export const isReservedFieldKey = (key: string): boolean => fieldKeys.has(key)
/** True for a reserved field key that has no meaning yet. */
export const isFutureFieldKey = (key: string): boolean => futureFieldKeys.has(key)
export const isReservedLayoutType = (type: string): boolean => layoutTypes.has(type)
export const isReservedLayoutKey = (key: string): boolean => layoutKeys.has(key)
export const isReservedRuleKey = (key: string): boolean => ruleKeys.has(key)
export const isReservedFormRuleKey = (key: string): boolean => formRuleKeys.has(key)
export const isReservedName = (name: string): boolean => names.has(name)
