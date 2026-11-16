// Every runtime the package supports has the web's AbortController and queueMicrotask: browsers,
// Node, Deno, Bun and workers. TypeScript declares them only with the DOM or Node types, which the
// package leaves out so it can't use anything else of theirs, so they are read from `globalThis`.

/**
 * The runtime's `AbortSignal`: the DOM's or Node's where their types are there, so it can go to
 * `fetch()`. Without them, the parts every signal has.
 */
export type WebAbortSignal = typeof globalThis extends {
  AbortSignal: { prototype: infer TSignal }
}
  ? TSignal
  : BaseAbortSignal

interface BaseAbortSignal {
  readonly aborted: boolean
  readonly reason: unknown
  addEventListener(type: 'abort', listener: () => void, options?: { once?: boolean }): void
  removeEventListener(type: 'abort', listener: () => void): void
  throwIfAborted(): void
}

export interface WebAbortController {
  readonly signal: WebAbortSignal
  abort(reason?: unknown): void
}

export const createAbortController = (): WebAbortController =>
  new (globalThis as unknown as { AbortController: new () => WebAbortController }).AbortController()

/** Throws `error` in a microtask, so it shows like any uncaught error, and is never swallowed. */
export function throwLater(error: unknown): void {
  ;(globalThis as unknown as { queueMicrotask(callback: () => void): void }).queueMicrotask(() => {
    throw error
  })
}
