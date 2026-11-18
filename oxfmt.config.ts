import { defineConfig } from 'oxfmt'
import whatsaaaa from '@whatsaaaa/format-config/oxfmt'

export default defineConfig({
  ...whatsaaaa,
  ignorePatterns: ['pnpm-lock.yaml', '.github/assets'],
})
