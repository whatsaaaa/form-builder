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
  'ui'
  ] as const

/**
 * Rule keys this package own. A rule's params can't use them.
 */
export const RESERVED_RULE_KEYS = ['rule', 'message'] as const

const fieldKeys: ReadonlySet<string> = new Set(RESERVED_FIELD_KEYS)
const ruleKeys: ReadonlySet<string> = new Set(RESERVED_RULE_KEYS)

export const isReservedFieldKey = (key: string): boolean => fieldKeys.has(key)
export const isReservedRuleKey = (key: string): boolean => ruleKeys.has(key)
