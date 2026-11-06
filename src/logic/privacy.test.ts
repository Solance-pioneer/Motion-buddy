import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const forbidden = [
  'getUserMedia',
  'mediaDevices',
  'geolocation',
  'AudioContext',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'sendBeacon',
  'WebSocket',
  'XMLHttpRequest',
  'fetch(',
  'Bram',
  'lantern',
  'Mochi',
  'Waze',
]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'owner') return []
      return sourceFiles(path)
    }
    if (entry.name === 'review.ts' || entry.name === 'catalog.ts' || entry.name === 'playlist.ts') return []
    return /\.(ts|tsx|css)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : []
  })
}

describe('privacy and scope', () => {
  it('does not reference capture, location, storage, network, or the retired lantern', () => {
    const haystack = sourceFiles(join(process.cwd(), 'src'))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')
    for (const term of forbidden) {
      expect(haystack.includes(term), term).toBe(false)
    }
  })
})
