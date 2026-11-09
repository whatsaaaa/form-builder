/** A MIME type, such as `image/png`. */
export type MimeType = `${string}/${string}`

/**
 * A File only carries its exact MIME type, and Valibot compares it exactly, so extensions
 * (`.pdf`) and wildcards (`image/*`) can't be checked against it.
 */
export const MIME_TYPE_REGEX = /^[\w.+-]+\/[\w.+-]+$/

export const isMimeType = (input: string): input is MimeType => MIME_TYPE_REGEX.test(input)
