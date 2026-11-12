import { describe, expect, it } from 'vitest'
import { chooseIdleAction, nextIdleClip } from './clip-table.ts'
import { allIdleOn, enabledClipIds, enabledCodedIds, enabledIdleIds, idleChoices, idlePrefsFromStorage, idlePrefsToStorage, toggleIdlePref } from './idle-prefs.ts'
import { nextAmbientScene, SCENE_ORDER } from './scenes.ts'

describe('idle expression prefs', () => {
  it('keeps new and unknown ids on, and restores every item when storage would enable none', () => {
    const choices = idleChoices()
    const stored = idlePrefsFromStorage(JSON.stringify({ off: ['not-a-real-clip', 'shy-peek', 4] }))
    expect(stored.off).toEqual(['shy-peek'])
    const enabled = enabledIdleIds(stored)
    expect(enabled.has('shy-peek')).toBe(false)
    expect(enabled.has('leaf-catch-hd')).toBe(true)
    expect(enabled.has('ninja')).toBe(true)
    const cleared = idlePrefsFromStorage(JSON.stringify({ off: choices.map((choice) => choice.id) }))
    expect(cleared.off).toEqual([])
    expect(enabledIdleIds(cleared).size).toBe(choices.length)
    expect(idlePrefsFromStorage('nope')).toEqual(allIdleOn())
    expect(idlePrefsFromStorage(idlePrefsToStorage({ off: ['wink-kiss'] })).off).toEqual(['wink-kiss'])
  })

  it('refuses to turn off the last idle and turns them all back on', () => {
    const choices = idleChoices()
    const only = choices[0]
    if (!only) throw new Error('missing idle choice')
    const prefs = { off: choices.slice(1).map((choice) => choice.id) }
    expect([...enabledIdleIds(prefs)]).toEqual([only.id])
    expect(toggleIdlePref(prefs, only.id, false)).toEqual(prefs)
    expect(toggleIdlePref(prefs, only.id, true).off).not.toContain(only.id)
    expect(toggleIdlePref({ off: ['shy-peek'] }, 'made-up', false).off).toEqual(['shy-peek'])
  })

  it('keeps disabled clips and coded scenes out of idle selection', () => {
    const clips = enabledClipIds({ off: ['shy-peek', 'ninja'] })
    expect(clips.has('shy-peek')).toBe(false)
    expect(clips.has('sneeze')).toBe(true)
    for (let i = 0; i < 40; i += 1) {
      const id = nextIdleClip(null, i / 40, clips)
      expect(id).not.toBe('shy-peek')
      expect(id == null || clips.has(id)).toBe(true)
    }
    const onlySneeze = new Set(['sneeze'])
    expect(chooseIdleAction(0, false, null, 0, onlySneeze)).toEqual({ kind: 'clip', id: 'sneeze' })
    expect(chooseIdleAction(0, false, 'sneeze', 0, onlySneeze).kind).toBe('coded')
    const coded = enabledCodedIds({ off: ['ninja', 'sneeze'] })
    expect(coded.has('ninja')).toBe(false)
    expect(nextAmbientScene(null, coded)).toBe('cord_hero')
    expect(nextAmbientScene('sheet_ghost', coded)).toBe('cord_hero')
    expect(nextAmbientScene(null, new Set())).toBeNull()
    for (const key of SCENE_ORDER) expect(nextAmbientScene(null, new Set([key]))).toBe(key)
  })
})
