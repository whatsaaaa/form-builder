import { createSchemaBuilder } from '@whatsaaaa/form-builder-schema'

// #region builders
export type Locale = 'en' | 'sr-Latn'

const translations: Record<Locale, Record<string, string>> = {
  en: { 'form.required': 'Required', 'signup.email': 'Email' },
  'sr-Latn': {
    'form.required': 'Obavezno polje',
    'signup.email': 'E-pošta',
  },
}

const builderFor = (locale: Locale) =>
  createSchemaBuilder({
    messages: { required: 'form.required' },
    resolveMessage: (key) => translations[locale][key],
  })

// One builder per language, made once.
export const builders = {
  en: builderFor('en'),
  'sr-Latn': builderFor('sr-Latn'),
}
// #endregion builders
