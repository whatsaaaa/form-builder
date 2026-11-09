import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // React and Vue render into jsdom. happy-dom can't check a radio button whose name has quotes,
    // and Formisch names every element with the JSON of its path, like ["newsletter"].
    environment: 'jsdom',
    // West of UTC, so a date that comes out at UTC midnight is the day before.
    env: { TZ: 'America/New_York' },
  },
})
