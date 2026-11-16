import type { FillSource } from '@whatsaaaa/form-builder-fills'

interface Profile {
  firstName: string
  lastName: string
  city: string
}

// Gives the values of the fields a fill sets, by their dot paths, for the
// value the user picked. The signal aborts the call when they pick another.
export const profiles: FillSource = async (value, { signal }) => {
  const response = await fetch(
    `/api/profiles/${encodeURIComponent(value)}`,
    { signal },
  )
  if (!response.ok) {
    throw new Error(`Profile ${value}: HTTP ${response.status}`)
  }
  const profile = (await response.json()) as Profile
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    'address.city': profile.city,
  }
}
