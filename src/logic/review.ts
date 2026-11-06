import { CANDIDATES } from './catalog.ts'

export const REVIEW_KEY = 'motion-buddy-review-v1'

export type Decision = 'keep' | 'reject'

export interface ReviewFile {
  version: 1
  decisions: Record<string, Decision>
  index: number
}

export function emptyReview(): ReviewFile {
  return { version: 1, decisions: {}, index: 0 }
}

export function parseReview(raw: string): ReviewFile | null {
  try {
    const value = JSON.parse(raw) as Partial<ReviewFile>
    if (value.version !== 1 || !value.decisions || typeof value.decisions !== 'object') return null
    const decisions: Record<string, Decision> = {}
    for (const [id, decision] of Object.entries(value.decisions)) {
      if (!CANDIDATES.some((item) => item.id === id)) continue
      if (decision === 'keep' || decision === 'reject') decisions[id] = decision
    }
    const index = Number.isFinite(value.index) ? Math.max(0, Math.floor(value.index ?? 0)) : 0
    return { version: 1, decisions, index: Math.min(index, Math.max(0, CANDIDATES.length - 1)) }
  } catch {
    return null
  }
}

export function loadReview(read: (key: string) => string | null = defaultRead): ReviewFile {
  const raw = read(REVIEW_KEY)
  if (!raw) return emptyReview()
  return parseReview(raw) ?? emptyReview()
}

export function saveReview(file: ReviewFile, write: (key: string, value: string) => void = defaultWrite): void {
  write(REVIEW_KEY, JSON.stringify(file))
}

export function keptIds(file: ReviewFile): string[] {
  return CANDIDATES.filter((item) => file.decisions[item.id] === 'keep').map((item) => item.id)
}

export function counts(file: ReviewFile): { kept: number; rejected: number; unreviewed: number } {
  let kept = 0
  let rejected = 0
  for (const candidate of CANDIDATES) {
    const decision = file.decisions[candidate.id]
    if (decision === 'keep') kept += 1
    else if (decision === 'reject') rejected += 1
  }
  return { kept, rejected, unreviewed: CANDIDATES.length - kept - rejected }
}

function defaultRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function defaultWrite(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Private mode can refuse storage. Export still works.
  }
}
