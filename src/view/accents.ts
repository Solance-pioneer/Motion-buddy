export const ACCENTS = [
  { id: 'white', label: 'White', face: '#ffffff' },
  { id: 'mist', label: 'Mist', face: '#d5ebe3' },
  { id: 'dusk', label: 'Dusk', face: '#d7def5' },
  { id: 'clay', label: 'Clay', face: '#f3d4c4' },
] as const

export type AccentId = (typeof ACCENTS)[number]['id']

export function accentById(id: AccentId) {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0]
}
