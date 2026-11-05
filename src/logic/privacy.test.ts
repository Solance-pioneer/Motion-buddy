import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const forbidden = [
  'getUserMedia',
  'mediaDevices',
  'geolocation',
  'AudioContext',
  'devicemotion',
  'accelerometer',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'sendBeacon',
  'WebSocket',
  'XMLHttpRequest',
  'fetch(',
]

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx|css)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : []
  })
}

describe('privacy boundary', () => {
  it('does not reference capture, location, storage, or network APIs', () => {
    const haystack = sourceFiles(join(process.cwd(), 'src'))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')
    for (const term of forbidden) {
      expect(haystack.includes(term), term).toBe(false)
    }
  })
})
