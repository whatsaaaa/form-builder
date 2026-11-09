import * as v from 'valibot'
import type { AnyAction } from '../shared/valibot-types'
import { defineRule } from './define-rule'
import type { RuleDef } from './rule-def'

const iso = (label: string, description: string, create: (message?: string) => AnyAction) =>
  defineRule({
    kinds: ['string', 'date'],
    meta: { label, description, category: 'date' },
    create: (_, message) => create(message),
  })

export const dateRules = {
  isoDate: iso('ISO date', 'Like 2026-10-28', (m) => v.isoDate(m)),
  isoDateTime: iso('ISO date and time', 'Like 2026-10-28T14:30', (m) => v.isoDateTime(m)),
  isoTime: iso('ISO time', 'Like 14:30', (m) => v.isoTime(m)),
  isoTimeSecond: iso('ISO time with seconds', 'Like 14:30:15', (m) => v.isoTimeSecond(m)),
  isoTimestamp: iso('ISO timestamp', 'Like 2026-10-28T14:30:15.000Z', (m) => v.isoTimestamp(m)),
  isoWeek: iso('ISO week', 'Like 2026-W44', (m) => v.isoWeek(m)),
} satisfies Record<string, RuleDef>
