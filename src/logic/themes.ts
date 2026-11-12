export const THEME_IDS = ['plain', 'race-kerb', 'night-drive', 'neon-city'] as const
export type ThemeId = (typeof THEME_IDS)[number]

/** Gate id passed to isUnlocked. Plain is always available. */
export const THEME_FEATURE: Record<ThemeId, string | null> = {
  plain: null,
  'race-kerb': 'theme-race-kerb',
  'night-drive': 'theme-night-drive',
  'neon-city': 'theme-neon-city',
}

export function themeOpen(id: ThemeId, unlocked: (feature: string) => boolean): boolean {
  const feature = THEME_FEATURE[id]
  if (!feature) return true
  return unlocked(feature)
}

/** Race uses the kerb when that tier is open. Otherwise the chosen theme, or plain. */
export function activeTheme(input: { race: boolean; chosen: ThemeId }, unlocked: (feature: string) => boolean): ThemeId {
  if (input.race && themeOpen('race-kerb', unlocked)) return 'race-kerb'
  if (themeOpen(input.chosen, unlocked)) return input.chosen
  return 'plain'
}

export function themeFromStorage(raw: string | null): ThemeId {
  if (raw && (THEME_IDS as readonly string[]).includes(raw)) return raw as ThemeId
  return 'plain'
}
