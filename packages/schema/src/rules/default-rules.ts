import { comparisonRules } from './comparison-rules'
import { contentRules } from './content-rules'
import { dateRules } from './date-rules'
import { fileRules } from './file-rules'
import { formatRules } from './format-rules'
import { lengthRules } from './length-rules'
import { normalizeRules } from './normalize-rules'
import { numberRules } from './number-rules'
import { textUnitRules } from './text-unit-rules'

/** Every built-in rule. Register single families with `includeDefaultRules: false`. */
export const defaultRules = {
  ...lengthRules,
  ...textUnitRules,
  ...contentRules,
  ...formatRules,
  ...dateRules,
  ...comparisonRules,
  ...numberRules,
  ...fileRules,
  ...normalizeRules,
}
