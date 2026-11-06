export const ACCENTS = [
  { id: 'mist', label: 'Mist', bg: '#e4ebe6', iris: '#3f6f62' },
  { id: 'dusk', label: 'Dusk', bg: '#e6e8f0', iris: '#3d5674' },
  { id: 'clay', label: 'Clay', bg: '#f3e6d8', iris: '#8a5a42' },
  { id: 'tide', label: 'Tide', bg: '#e2eef0', iris: '#2c6d76' },
] as const

export type AccentId = (typeof ACCENTS)[number]['id']

export function accentById(id: AccentId) {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0]
}
