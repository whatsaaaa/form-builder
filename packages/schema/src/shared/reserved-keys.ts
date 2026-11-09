/**
 * Field keys this package owns. A field type's props can't use them.
 */
export const RESERVED_FIELD_KEYS = [
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
const ruleKeys: ReadonlySet<string> = new Set(RESERVED_RULE_KEYS)
const formRuleKeys: ReadonlySet<string> = new Set(RESERVED_FORM_RULE_KEYS)
const names: ReadonlySet<string> = new Set(RESERVED_NAMES)

export const isReservedFieldKey = (key: string): boolean => fieldKeys.has(key)
export const isReservedRuleKey = (key: string): boolean => ruleKeys.has(key)
export const isReservedFormRuleKey = (key: string): boolean => formRuleKeys.has(key)
export const isReservedName = (name: string): boolean => names.has(name)
