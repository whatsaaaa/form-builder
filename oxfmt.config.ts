import { defineConfig } from 'oxfmt'
import whatsaaaa from '@whatsaaaa/format-config/oxfmt'

export default defineConfig({
  ...whatsaaaa,
  ignorePatterns: [
    'pnpm-lock.yaml',
    '.github/assets',
    // Copier writes it, and wraps the long description in a style oxfmt would change.
    '.copier-answers.yml',
    'packages/schema/definition.schema.json',
    'apps/docs/api/schema/field-types.md',
    'apps/docs/api/schema/rules.md',
    'packages/affects/definition.schema.json',
    'apps/docs/public/schema/v1/definition.schema.json',
    'apps/docs/public/schema/v1/affects/definition.schema.json',
    'packages/fills/definition.schema.json',
    'apps/docs/public/schema/v1/fills/definition.schema.json',
  ],
  overrides: [
    {
      files: ['apps/docs/**/*.md', 'apps/docs/snippets/**'],
      options: {
        printWidth: 76,
      },
    },
  ],
})
