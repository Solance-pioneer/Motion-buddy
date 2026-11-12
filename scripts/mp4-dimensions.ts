import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const CONTAINERS = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts'])

/** Coded picture width. avc1 wins; otherwise the video track header. */
export function readMp4VideoWidth(buf: Buffer): number {
  const found: number[] = []

  const walk = (start: number, end: number, track: { handler: string; tkhd: number; avc: number } | null) => {
    let offset = start
    while (offset + 8 <= end) {
      let size = buf.readUInt32BE(offset)
      const type = buf.toString('latin1', offset + 4, offset + 8)
      let header = 8
      if (size === 1) {
        if (offset + 16 > end) return
        size = Number(buf.readBigUInt64BE(offset + 8))
        header = 16
      } else if (size === 0) {
        size = end - offset
      }
      if (!Number.isFinite(size) || size < header || offset + size > end) return
      const payload = offset + header
      const payloadEnd = offset + size
      if (type === 'trak') {
        const next = { handler: '', tkhd: 0, avc: 0 }
        walk(payload, payloadEnd, next)
        if (next.avc > 0) found.push(next.avc)
        else if (next.handler === 'vide' && next.tkhd > 0) found.push(next.tkhd)
      } else if (type === 'stsd') {
        walk(payload + 8, payloadEnd, track)
      } else if (CONTAINERS.has(type)) {
        walk(payload, payloadEnd, track)
      } else if (type === 'tkhd' && track) {
        track.tkhd = tkhdWidth(buf, payload, payloadEnd)
      } else if (type === 'hdlr' && track && payload + 12 <= payloadEnd) {
        track.handler = buf.toString('latin1', payload + 8, payload + 12)
      } else if ((type === 'avc1' || type === 'avc3') && track) {
        track.avc = avcWidth(buf, payload, payloadEnd)
      }
      offset += size
    }
  }

  walk(0, buf.length, null)
  return found.length > 0 ? Math.max(...found) : 0
}

function tkhdWidth(buf: Buffer, payload: number, payloadEnd: number): number {
  const version = buf[payload] ?? 0
  const at = payload + (version === 1 ? 88 : 76)
  if (at + 4 > payloadEnd) return 0
  return buf.readUInt32BE(at) >>> 16
}

function avcWidth(buf: Buffer, payload: number, payloadEnd: number): number {
  const at = payload + 24
  if (at + 2 > payloadEnd) return 0
  return buf.readUInt16BE(at)
}

const CLIP_DIRS = [
  'src/assets/scene-clips-batch1-v1',
  'src/assets/scene-clips-batch2-v1',
  'src/assets/hd-test',
  'src/assets/scene-clips-v1',
]

/** Basename to coded width, for the gallery build. Playback does not measure the files. */
export function collectClipWidths(root = process.cwd()): Record<string, number> {
  const widths: Record<string, number> = {}
  for (const dir of CLIP_DIRS) {
    let names: string[] = []
    try {
      names = readdirSync(join(root, dir))
    } catch {
      continue
    }
    for (const name of names) {
      if (!name.endsWith('.mp4')) continue
      const width = readMp4VideoWidth(readFileSync(join(root, dir, name)))
      if (width > 0) widths[name] = width
    }
  }
  return widths
}
