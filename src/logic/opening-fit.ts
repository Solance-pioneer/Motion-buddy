export interface FitPoint {
  x: number
  y: number
}

export interface FitRect {
  x: number
  y: number
  right: number
  bottom: number
}

/** The drawn box sits inside the outline, clear of the visible stroke. */
const KAPPA = 0.5522847498

/**
 * The path is eyePath for the published eye height. A positive peak shortens the
 * drawn outline below that height, so the outline is not required to equal h.
 */
export function publishedEyeAgrees(path: string, eyeH: number): boolean {
  const nums = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
  const cubics = path.match(/C/g)?.length ?? 0
  if (cubics !== 4 || !path.trim().endsWith('Z') || nums.length < 26 || !(eyeH > 0)) return false
  const cx = nums[0]
  const yTop = nums[1]
  const kx = nums[2] - cx
  const rx = nums[6] - cx
  const ySide = nums[7]
  const yBot = nums[13]
  const left = nums[18]
  if (!(rx > 1 && Math.abs(kx / rx - KAPPA) < 0.04 && Math.abs(cx - left - rx) < 0.45)) return false
  const ry = Math.max(1.6, eyeH) / 2
  const top = ySide - yTop
  const bot = yBot - ySide
  if (!(top > 0)) return false
  const closure = (ry - bot) / (ry + 0.55 * top)
  if (!(closure >= -0.05 && closure < 0.98)) return false
  if (closure <= 0.02) return Math.abs(top - ry) <= 0.25 && Math.abs(bot - ry) <= 0.25
  const smile = (closure * ry) / (1 - closure)
  const expectedTop = ry * (1 - closure) + Math.min(rx * 0.62, ry * 0.35 + smile * 0.45) * closure
  return Math.abs(expectedTop - top) <= 0.25
}

export function openingClears(box: FitRect, points: FitPoint[], pad: number): boolean {
  if (!(pad >= 0) || points.length < 8) return false
  if (!(box.right > box.x && box.bottom > box.y)) return false
  const rows = [box.y + 1, (box.y + box.bottom) / 2, box.bottom - 1]
  for (const y of rows) {
    const band = points.filter((point) => Math.abs(point.y - y) <= Math.max(12, pad * 4))
    if (band.length < 2) return false
    const left = Math.min(...band.map((point) => point.x)) + pad
    const right = Math.max(...band.map((point) => point.x)) - pad
    if (box.x < left || box.right > right) return false
  }
  return points.every((point) => {
    const nearestX = Math.max(box.x, Math.min(point.x, box.right))
    const nearestY = Math.max(box.y, Math.min(point.y, box.bottom))
    return Math.hypot(point.x - nearestX, point.y - nearestY) >= pad
  })
}
