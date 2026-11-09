// jsdom, for components built by Qwik's Vite plugin.
import { builtinEnvironments, type Environment } from 'vitest/runtime'

const { jsdom } = builtinEnvironments

export default {
  ...jsdom,
  name: 'qwik-jsdom',
  // Vite's client environment would split each $ function into a module of its own, loaded when
  // it first runs, which Vitest can't load. For the server, Qwik keeps them in their module.
  viteEnvironment: 'ssr',
  async setup(global, options) {
    const environment = await jsdom.setup(global, options)
    // Qwik tells a browser from a DOM made on the server by whether HTMLElement is native code.
    // jsdom's isn't, so Qwik would render the way it does on the server, and nothing would show.
    Object.defineProperty(global.HTMLElement, 'toString', {
      value: () => 'function HTMLElement() { [native code] }',
    })
    return environment
  },
} satisfies Environment
