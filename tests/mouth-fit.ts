export interface FitBox {
  x: number
  y: number
  right: number
  bottom: number
  width: number
  height: number
}

/** Finite screen box with both sides strictly positive. Subpixel height counts; zero does not. */
export function positiveBox(box: Partial<FitBox> | null | undefined): box is FitBox {
  if (!box) return false
  const values = [box.x, box.y, box.right, box.bottom, box.width, box.height]
  return values.every((value) => typeof value === 'number' && Number.isFinite(value)) && box.width > 0 && box.height > 0
}

/** Closed two-quadratic mouth outline with a nonzero span. Letters alone are not geometry. */
export function mouthPathExtent(path: string | null | undefined): { valid: boolean; width: number; height: number } {
  const empty = { valid: false, width: 0, height: 0 }
  if (!path || !/^M\s+-?\d/i.test(path.trim()) || !/Z\s*$/i.test(path.trim())) return empty
  const quadratics = path.match(/Q\s+-?\d/gi)
  if (!quadratics || quadratics.length < 2) return empty
  const nums = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
  if (nums.length < 10 || nums.some((value) => !Number.isFinite(value))) return empty
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i + 1 < nums.length; i += 2) {
    xs.push(nums[i])
    ys.push(nums[i + 1])
  }
  const width = Math.max(...xs) - Math.min(...xs)
  const height = Math.max(...ys) - Math.min(...ys)
  return { valid: width > 0 && height > 0, width, height }
}

/** Same ±1px slack the eye and mask checks already use. */
export function boxInside(outer: Partial<FitBox> | null | undefined, inner: Partial<FitBox> | null | undefined): boolean {
  if (!positiveBox(outer) || !positiveBox(inner)) return false
  return inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1
}

export function mouthContained(input: {
  path: string | null | undefined
  box: Partial<FitBox> | null | undefined
  chin: Partial<FitBox> | null | undefined
}): boolean {
  return mouthPathExtent(input.path).valid && boxInside(input.chin, input.box)
}
