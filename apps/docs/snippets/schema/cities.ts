import type { FillSource } from '@whatsaaaa/form-builder-fills'

// Waits `ms`, or rejects as soon as `signal` aborts.
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })

// Each keystroke in the ZIP code aborts the call before it, so only the
// last one, 300 ms after the user stops typing, reaches the server.
export const cities: FillSource = async (zip, { signal }) => {
  await wait(300, signal)
  const response = await fetch(
    `/api/zip-codes/${encodeURIComponent(zip)}`,
    { signal },
  )
  // No city for this ZIP code: the city is set blank.
  if (!response.ok) return null
  const { city } = (await response.json()) as { city: string }
  return { 'address.city': city }
}
