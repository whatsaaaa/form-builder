const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u

/**
 * The Date of an ISO date or date and time without a time zone, in the time zone the code runs in.
 * `new Date()` reads a date alone, like 2026-10-28, as UTC midnight, which is the day before west
 * of UTC. Here it is local midnight, like 2026-10-28T00:00.
 */
export const toLocalDate = (iso: string): Date =>
  new Date(ISO_DATE.test(iso) ? `${iso}T00:00` : iso)
