import { comparisonRules } from './comparison-rules'
import { contentRules } from './content-rules'
import { dateRules } from './date-rules'
import { fileRules } from './file-rules'
import { formatRules } from './format-rules'
import { lengthRules } from './length-rules'
import { normalizeRules } from './normalize-rules'
import { numberRules } from './number-rules'
import { textRules } from './text-rules'

/** Every built-in rule. Register single families with `includeDefaultRules: false`. */
export const defaultRules = {
  ...lengthRules,
  ...textRules,
  ...contentRules,
  ...formatRules,
  ...dateRules,
  ...comparisonRules,
  ...numberRules,
  ...fileRules,
  ...normalizeRules,
}
