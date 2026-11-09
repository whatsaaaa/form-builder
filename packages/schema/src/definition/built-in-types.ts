/**
 * The built-in display elements, which have no value. The functions that need no builder know
 * them by name, and `displayTypes` has exactly these keys.
 */
export const DISPLAY_TYPES = ['heading', 'paragraph', 'divider'] as const

const displayTypeNames: ReadonlySet<string> = new Set(DISPLAY_TYPES)

export const isDisplayType = (type: string): boolean => displayTypeNames.has(type)
