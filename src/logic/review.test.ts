import { describe, expect, it } from 'vitest'
import { CANDIDATES } from './catalog.ts'
import { companionBeats, sampleBeats } from './playlist.ts'
import { counts, keptIds, parseReview } from './review.ts'

describe('review file', () => {
  it('keeps an earlier 48-face review and ignores ids that are not in this build', () => {
    const decisions = Object.fromEntries(CANDIDATES.map((item, index) => [item.id, index % 2 === 0 ? 'keep' : 'reject']))
    decisions.retired = 'keep'
    const parsed = parseReview(JSON.stringify({ version: 1, decisions, index: 4 }))
    expect(parsed?.decisions.curious).toBe('keep')
    expect(parsed?.decisions.retired).toBeUndefined()
    expect(Object.keys(parsed?.decisions ?? {})).toHaveLength(CANDIDATES.length)
    expect(parsed?.index).toBe(4)
  })

  it('rejects malformed files and unknown faces', () => {
    expect(parseReview('nope')).toBeNull()
    expect(parseReview(JSON.stringify({ version: 2, decisions: {} }))).toBeNull()
    const parsed = parseReview(JSON.stringify({ version: 1, decisions: { curious: 'keep', nope: 'keep', beam: 'reject' }, index: 3 }))
    expect(parsed?.decisions).toEqual({ curious: 'keep', beam: 'reject' })
    expect(parsed?.index).toBe(3)
  })

  it('does not treat unreviewed or rejected faces as kept', () => {
    const file = { version: 1 as const, decisions: { curious: 'keep' as const, beam: 'reject' as const }, index: 0 }
    expect(keptIds(file)).toEqual(['curious'])
    expect(counts(file).unreviewed).toBe(CANDIDATES.length - 2)
    const beats = companionBeats(keptIds(file), 'desk')
    expect(beats.every((beat) => beat.id === 'curious')).toBe(true)
    expect(sampleBeats(beats, 10_000)?.id).toBe('curious')
    expect(companionBeats([], 'desk')).toEqual([])
  })
})
