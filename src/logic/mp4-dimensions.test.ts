import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { collectClipWidths, readMp4VideoWidth } from '../../scripts/mp4-dimensions.ts'
import { CLIP_ROWS } from './clip-table.ts'
import { clipDefinition } from './clip-definition.ts'

const DIRS = [
  'src/assets/scene-clips-batch1-v1',
  'src/assets/scene-clips-batch2-v1',
  'src/assets/hd-test',
  'src/assets/scene-clips-v1',
]

describe('clip definition badges', () => {
  const widths = collectClipWidths()

  it('treats 720 and wider as HD and the 480-wide films as SD', () => {
    expect(clipDefinition(719)).toBe('SD')
    expect(clipDefinition(720)).toBe('HD')
    expect(widths['sneeze-v2-app.mp4']).toBe(480)
    expect(clipDefinition(widths['sneeze-v2-app.mp4'] ?? 0)).toBe('SD')
    expect(widths['leaf-catch-hd-v1.mp4']).toBe(1152)
    expect(clipDefinition(widths['leaf-catch-hd-v1.mp4'] ?? 0)).toBe('HD')
    expect(widths['giggle-fit-v4a-chirpy-app.mp4']).toBe(720)
    expect(clipDefinition(widths['giggle-fit-v4a-chirpy-app.mp4'] ?? 0)).toBe('HD')
  })

  it('parses a width for every gallery file and keeps the stored reading honest', () => {
    expect(existsSync('src/assets/hd-test/glass-squish-gentle-v1.mp4')).toBe(false)
    for (const row of CLIP_ROWS) {
      if (!row.file) continue
      const path = DIRS.map((dir) => `${dir}/${row.file}`).find((candidate) => existsSync(candidate))
      expect(path, row.file).toBeTruthy()
      const width = readMp4VideoWidth(readFileSync(path ?? ''))
      expect(width, row.file).toBeGreaterThan(0)
      expect(widths[row.file], row.file).toBe(width)
    }
  })
})
