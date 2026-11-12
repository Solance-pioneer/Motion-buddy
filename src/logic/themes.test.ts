import { describe, expect, it } from 'vitest'
import { activeTheme, themeFromStorage, themeOpen } from './themes.ts'

const open = () => true
const closed = (id: string) => id !== 'theme-race-kerb'

describe('screen themes', () => {
  it('keeps plain as the default and uses the race kerb only when that tier is open', () => {
    expect(themeFromStorage(null)).toBe('plain')
    expect(themeFromStorage('nope')).toBe('plain')
    expect(themeOpen('plain', closed)).toBe(true)
    expect(activeTheme({ race: false, chosen: 'plain' }, open)).toBe('plain')
    expect(activeTheme({ race: true, chosen: 'plain' }, open)).toBe('race-kerb')
    expect(activeTheme({ race: true, chosen: 'plain' }, closed)).toBe('plain')
    expect(activeTheme({ race: false, chosen: 'night-drive' }, () => false)).toBe('plain')
    expect(activeTheme({ race: false, chosen: 'neon-city' }, open)).toBe('neon-city')
  })
})
