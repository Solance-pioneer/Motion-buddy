import { CLIP_ROWS } from './clip-table.ts'
import { SCENE_ORDER, type SceneKey } from './scenes.ts'

/** Disabled idle ids only. Missing and new ids stay on. */
export const IDLE_PREFS_KEY = 'motion-buddy-idle-prefs-v1'

export type IdleKind = 'clip' | 'coded'

export interface IdleChoice {
  id: string
  label: string
  group: string
  kind: IdleKind
}

export interface IdlePrefs {
  off: string[]
}

const CODED_LABEL: Record<SceneKey, string> = {
  ninja: 'Ninja peek',
  cord_hero: 'Rope hero',
  racer: 'Little racer',
  sheet_ghost: 'Sheet ghost',
}

const FEELINGS = new Set([
  'sneeze',
  'hiccups',
  'giggle-fit',
  'love-hearts',
  'sulky-pout',
  'proud-sparkle',
  'shy-peek',
  'wink-kiss',
  'bright-idea',
  'mind-blown',
  'brain-freeze',
])

const PLAY = new Set([
  'noodles',
  'bubble-gum-pop',
  'juggling',
  'dance-groove',
  'headphones-jam',
  'karate-chop',
  'superhero-landing',
  'cool-shades',
  'soap-bubbles',
])

const DRESS = new Set(['superhero-idle', 'racer-idle'])

const GROUP_ORDER = ['Feelings', 'Play', 'Dress-up', 'More']

function titleOf(id: string): string {
  return id
    .split('-')
    .map((part) => part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part)
    .join(' ')
}

function groupOf(id: string): string {
  if (DRESS.has(id) || (SCENE_ORDER as readonly string[]).includes(id)) return 'Dress-up'
  if (FEELINGS.has(id)) return 'Feelings'
  if (PLAY.has(id)) return 'Play'
  return 'More'
}

/** Idle clips plus the four coded dress-up scenes. Touch reactions are not in this list. */
export function idleChoices(): IdleChoice[] {
  const clips = CLIP_ROWS.filter((row) => row.file && (row.trigger === 'idle' || row.id === 'superhero-idle' || row.id === 'racer-idle')).map((row) => ({
    id: row.id,
    label: row.label ?? titleOf(row.id),
    group: groupOf(row.id),
    kind: 'clip' as const,
  }))
  const coded = [
    ...SCENE_ORDER.map((id) => ({
      id,
      label: CODED_LABEL[id],
      group: 'Dress-up',
      kind: 'coded' as const,
    })),
    { id: 'ooh', label: 'Ooh', group: 'Feelings', kind: 'coded' as const },
  ]
  return [...clips, ...coded].sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.label.localeCompare(b.label))
}

export function idleGroups(choices: readonly IdleChoice[] = idleChoices()): string[] {
  return GROUP_ORDER.filter((group) => choices.some((choice) => choice.group === group))
}

export function allIdleOn(): IdlePrefs {
  return { off: [] }
}

/** Unknown stored ids are ignored. An empty enabled set falls back to every item on. */
export function idlePrefsFromStorage(raw: string | null, choices: readonly IdleChoice[] = idleChoices()): IdlePrefs {
  if (!raw) return allIdleOn()
  try {
    const parsed = JSON.parse(raw) as { off?: unknown }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.off)) return allIdleOn()
    const known = new Set(choices.map((choice) => choice.id))
    const off = [...new Set(parsed.off.filter((id): id is string => typeof id === 'string' && known.has(id)))]
    if (off.length >= choices.length) return allIdleOn()
    return { off }
  } catch {
    return allIdleOn()
  }
}

export function idlePrefsToStorage(prefs: IdlePrefs): string {
  return JSON.stringify({ off: prefs.off })
}

export function enabledIdleIds(prefs: IdlePrefs, choices: readonly IdleChoice[] = idleChoices()): Set<string> {
  const off = new Set(prefs.off)
  const enabled = choices.filter((choice) => !off.has(choice.id)).map((choice) => choice.id)
  if (enabled.length === 0) return new Set(choices.map((choice) => choice.id))
  return new Set(enabled)
}

/** Turning off the last enabled item does nothing. */
export function toggleIdlePref(prefs: IdlePrefs, id: string, on: boolean, choices: readonly IdleChoice[] = idleChoices()): IdlePrefs {
  const known = new Set(choices.map((choice) => choice.id))
  if (!known.has(id)) return prefs
  const enabled = enabledIdleIds(prefs, choices)
  if (!on) {
    if (!enabled.has(id) || enabled.size <= 1) return prefs
    return { off: [...prefs.off.filter((item) => item !== id && known.has(item)), id] }
  }
  return { off: prefs.off.filter((item) => item !== id) }
}

export function enabledClipIds(prefs: IdlePrefs, choices: readonly IdleChoice[] = idleChoices()): Set<string> {
  const enabled = enabledIdleIds(prefs, choices)
  return new Set(choices.filter((choice) => choice.kind === 'clip' && enabled.has(choice.id)).map((choice) => choice.id))
}

export function enabledCodedIds(prefs: IdlePrefs, choices: readonly IdleChoice[] = idleChoices()): Set<string> {
  const enabled = enabledIdleIds(prefs, choices)
  return new Set(choices.filter((choice) => choice.kind === 'coded' && enabled.has(choice.id)).map((choice) => choice.id))
}
