import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The components render into a DOM, and the tests type into it.
  test: { environment: 'happy-dom' },
})
