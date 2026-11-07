import { writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { mouthContained, mouthPathExtent, positiveBox } from './mouth-fit.ts'

async function openApp(page: Page) {
  await page.goto('/?e2e=1&hintMs=0')
  await page.waitForFunction(() => Boolean((window as unknown as { __motionBuddyTest?: unknown }).__motionBuddyTest))
  const skip = page.getByRole('button', { name: 'Not now' })
  if (await skip.count()) await skip.click()
}

async function play(page: Page, key: string) {
  const started = await page.evaluate((name) => {
    return (window as unknown as { __motionBuddyTest: { playScene: (key: string) => boolean } }).__motionBuddyTest.playScene(name)
  }, key)
  expect(started).toBe(true)
}

async function fitOf(page: Page, key: string) {
  return page.evaluate((name) => {
    // A blended grumpy mouth is a real crescent that can be under 1px tall.
      // That is still a mouth, so a short box is measured rather than discarded.
      const rect = (node: Element | null) => {
      if (!node) return null
      const box = node.getBoundingClientRect()
      if (!Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.width) || !Number.isFinite(box.height)) return null
      return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height }
    }
    const union = (nodes: Element[]) => {
      const boxes = nodes.map((node) => node.getBoundingClientRect()).filter((box) => box.width > 0.5 && box.height > 0.5)
      if (!boxes.length) return null
      return {
        x: Math.min(...boxes.map((box) => box.x)),
        y: Math.min(...boxes.map((box) => box.y)),
        right: Math.max(...boxes.map((box) => box.right)),
        bottom: Math.max(...boxes.map((box) => box.bottom)),
      }
    }
    const root = document.querySelector(`[data-costume="${name}"]`)
    const eyes = union([...document.querySelectorAll('[data-part="eye-l-path"], [data-part="eye-r-path"]')])
    const mouthNode = document.querySelector('[data-part="mouth"]')
    const mouth = rect(mouthNode)
    const mouthPath = mouthNode?.getAttribute('d') ?? ''
    const aperture = rect(root?.querySelector('[data-part="costume-aperture"]') ?? null)
    const chin = rect(root?.querySelector('[data-part="costume-chin"], [data-chin]') ?? null)
    const brows = [...(root?.querySelectorAll('[data-part="costume-brow"]') ?? [])].map((node) => rect(node)).filter(Boolean)
    const inside = (outer: { x: number; y: number; right: number; bottom: number } | null, inner: { x: number; y: number; right: number; bottom: number } | null) =>
      Boolean(outer && inner && inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1)
    const hits = (a: { x: number; y: number; right: number; bottom: number }, b: { x: number; y: number; right: number; bottom: number }) =>
      Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1
    const mask = rect(root ?? null)
    const mute = document.querySelector('.mute-chip')?.getBoundingClientRect()
    const muteOverlap = Boolean(mask && mute && hits(mask, mute))
    return {
      eyesInside: inside(aperture, eyes),
      browClear: Boolean(eyes && brows.every((brow) => brow && !hits(eyes, brow))),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        maskInside: Boolean(mask && mask.x >= -2 && mask.y >= -2 && mask.right <= window.innerWidth + 2 && mask.bottom <= window.innerHeight + 2),
      },
      muteOverlap,
      expression: document.querySelector('main')?.dataset.expression ?? '',
      mouthPath,
      eyes,
      mouth,
      aperture,
      chin,
    }
  }, key)
}

function judged(raw: Awaited<ReturnType<Page['evaluate']>>) {
  const fit = raw as {
    mouthPath: string
    mouth: { x: number; y: number; right: number; bottom: number; width: number; height: number } | null
    chin: { x: number; y: number; right: number; bottom: number; width: number; height: number } | null
  }
  const extent = mouthPathExtent(fit.mouthPath)
  return {
    ...fit,
    mouthDrawn: extent.valid && positiveBox(fit.mouth),
    mouthInside: mouthContained({ path: fit.mouthPath, box: fit.mouth, chin: fit.chin }),
  }
}

async function occlusionOf(page: Page, key: string) {
  return page.evaluate((name) => {
    const cover = document.querySelector(`[data-part="costume-occlude"][data-costume="${name}"]`)
    const opacity = cover ? Number(cover.getAttribute('opacity') ?? getComputedStyle(cover).opacity) : 0
    const box = cover?.getBoundingClientRect()
    const mouth = document.querySelector('[data-part="mouth"]')?.getBoundingClientRect()
    const eyes = [...document.querySelectorAll('[data-part="eye-l-path"], [data-part="eye-r-path"]')].map((node) => node.getBoundingClientRect())
    const contains = (outer: DOMRect | undefined, inner: DOMRect | undefined) =>
      Boolean(outer && inner && inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1)
    const eyeHit = eyes.some((eye) => contains(box, eye))
    return { opacity, coversMouth: opacity > 0.5 && contains(box, mouth), coversEyes: opacity > 0.5 && eyeHit }
  }, key)
}

async function maskBox(page: Page, key: string) {
  return page.evaluate((name) => {
    const node = document.querySelector(`[data-costume="${name}"]`)
    const mute = document.querySelector('.mute-chip')?.getBoundingClientRect()
    const box = node?.getBoundingClientRect()
    if (!box) return null
    const overlap = mute
      ? Math.min(box.right, mute.right) - Math.max(box.left, mute.left) > 0 &&
        Math.min(box.bottom, mute.bottom) - Math.max(box.top, mute.top) > 0
      : false
    return {
      x: box.x,
      y: box.y,
      right: box.right,
      bottom: box.bottom,
      width: box.width,
      height: box.height,
      muteOverlap: overlap,
    }
  }, key)
}

test.describe('costume scenes', () => {
  test.setTimeout(40_000)

  for (const scene of [
    { key: 'ninja', label: 'Ninja peek', hold: 2_400, total: 6_000 },
    { key: 'cord_hero', label: 'Rope hero', hold: 3_200, total: 7_000 },
    { key: 'racer', label: 'Little racer', hold: 3_000, total: 7_000 },
    { key: 'sheet_ghost', label: 'Sheet ghost', hold: 3_200, total: 7_500 },
  ]) {
    test(`${scene.label} plays through and returns to plain Buddy`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 })
      await openApp(page)
      await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
      await page.getByRole('button', { name: scene.label }).click()
      await page.keyboard.press('Escape')
      await expect(page.locator('main')).toHaveAttribute('data-scene', scene.key)
      await page.waitForTimeout(scene.hold)
      await expect(page.locator('main')).toHaveAttribute('data-scene-hold', '1')
      const box = await maskBox(page, scene.key)
      expect(box, 'costume mask').toBeTruthy()
      expect(box!.width).toBeGreaterThan(40)
      expect(box!.x).toBeGreaterThanOrEqual(-2)
      expect(box!.y).toBeGreaterThanOrEqual(-2)
      expect(box!.right).toBeLessThanOrEqual(392)
      expect(box!.bottom).toBeLessThanOrEqual(846)
      expect(box!.muteOverlap).toBe(false)
      const fit = judged(await fitOf(page, scene.key))
      expect(fit.eyesInside, JSON.stringify(fit)).toBe(true)
      expect(fit.mouthDrawn, JSON.stringify(fit)).toBe(true)
      expect(fit.mouthInside, JSON.stringify(fit)).toBe(true)
      expect(fit.browClear, JSON.stringify(fit)).toBe(true)
      expect(fit.viewport.maskInside).toBe(true)
      const cover = await occlusionOf(page, scene.key)
      const shouldCover = scene.key === 'ninja' || scene.key === 'racer'
      expect(cover.coversMouth).toBe(shouldCover)
      expect(cover.coversEyes).toBe(false)
      writeFileSync(`/opt/cursor/artifacts/fit-${scene.key}-portrait.json`, JSON.stringify({ scene: scene.key, orient: 'portrait', cover, ...fit }, null, 2))
      await expect(page.locator('[data-part="eye-l-path"]')).toBeVisible()
      await expect(page.locator('[data-part="mouth"]')).toBeVisible()
      await page.screenshot({ path: `/opt/cursor/artifacts/scene-${scene.key}-portrait.png` })
      const beds = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { bedStarts: number } } }).__motionBuddyTest.contact())
      await page.mouse.click(200, 500)
      await page.mouse.move(40, 500)
      await page.mouse.down()
      await page.mouse.move(180, 520)
      await page.mouse.up()
      const after = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { bedStarts: number }; tryCue: (kind: string) => boolean } }).__motionBuddyTest.contact())
      expect(after.bedStarts).toBe(beds.bedStarts)
      expect(await page.evaluate(() => (window as unknown as { __motionBuddyTest: { tryCue: (kind: string) => boolean } }).__motionBuddyTest.tryCue('scan'))).toBe(false)
      await expect(page.locator('main')).toHaveAttribute('data-scene', scene.key)
      await page.waitForTimeout(scene.total - scene.hold + 400)
      await expect(page.locator('main')).toHaveAttribute('data-scene', '')
      await expect(page.locator(`[data-part="costume-mask"][data-costume="${scene.key}"]`)).toHaveAttribute('opacity', '0')
      await expect(page.locator('[data-part="costume-occlude"][data-costume="ninja"]')).toHaveAttribute('opacity', '0')
      await expect(page.locator('[data-part="costume-occlude"][data-costume="racer"]')).toHaveAttribute('opacity', '0')
    })
  }

  test('a finger held through the end does not start petting', async ({ page }) => {
    await openApp(page)
    await play(page, 'ninja')
    await page.waitForTimeout(5_500)
    await page.mouse.move(200, 400)
    await page.mouse.down()
    await page.mouse.move(80, 420)
    await page.waitForTimeout(900)
    await expect(page.locator('main')).toHaveAttribute('data-scene', '')
    const contact = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { bedStarts: number; active: boolean } } }).__motionBuddyTest.contact())
    expect(contact.bedStarts).toBe(0)
    expect(contact.active).toBe(false)
    await page.waitForTimeout(300)
    const still = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { bedStarts: number } } }).__motionBuddyTest.contact())
    expect(still.bedStarts).toBe(0)
    await page.mouse.up()
    await page.mouse.move(220, 400)
    await page.mouse.down()
    await page.mouse.move(80, 400)
    await page.waitForTimeout(200)
    const next = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { bedStarts: number } } }).__motionBuddyTest.contact())
    expect(next.bedStarts).toBe(1)
    await page.mouse.up()
  })

  test('mute and hiding stop scene audio without a later restart', async ({ page }) => {
    await openApp(page)
    await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
    await page.getByRole('button', { name: 'Little racer' }).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Mute' }).click()
    await expect(page.locator('main')).toHaveAttribute('data-scene', 'racer')
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(2_200)
    const audio = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { sceneAudio: () => { active: boolean } } }).__motionBuddyTest.sceneAudio())
    expect(audio.active).toBe(false)
    await expect(page.locator('main')).toHaveAttribute('data-scene', 'racer')
  })

  test('reduced motion keeps the scene but does not travel', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openApp(page)
    await play(page, 'cord_hero')
    await page.waitForTimeout(3_200)
    await expect(page.locator('main')).toHaveAttribute('data-scene', 'cord_hero')
    await expect(page.locator('main')).toHaveAttribute('data-scene-x', '0.0')
    await expect(page.locator('main')).toHaveAttribute('data-scene-y', '0.0')
    await page.waitForTimeout(4_000)
    await expect(page.locator('main')).toHaveAttribute('data-scene', '')
  })

  test('landscape keeps the revealed costumes inside the short screen', async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 844, height: 390 })
    await openApp(page)
    for (const scene of [
      { key: 'ninja', hold: 2_400, rest: 4_000 },
      { key: 'cord_hero', hold: 3_200, rest: 4_200 },
      { key: 'racer', hold: 3_000, rest: 4_400 },
      { key: 'sheet_ghost', hold: 3_200, rest: 4_800 },
    ]) {
      await play(page, scene.key)
      await page.waitForTimeout(scene.hold)
      const box = await maskBox(page, scene.key)
      expect(box!.x).toBeGreaterThanOrEqual(-2)
      expect(box!.y).toBeGreaterThanOrEqual(-2)
      expect(box!.right).toBeLessThanOrEqual(846)
      expect(box!.bottom).toBeLessThanOrEqual(392)
      const fit = judged(await fitOf(page, scene.key))
      expect(fit.eyesInside, JSON.stringify(fit)).toBe(true)
      expect(fit.mouthDrawn, JSON.stringify(fit)).toBe(true)
      expect(fit.mouthInside, JSON.stringify(fit)).toBe(true)
      expect(fit.browClear, JSON.stringify(fit)).toBe(true)
      expect(fit.viewport.maskInside).toBe(true)
      expect(fit.muteOverlap).toBe(false)
      const cover = await occlusionOf(page, scene.key)
      const shouldCover = scene.key === 'ninja' || scene.key === 'racer'
      expect(cover.coversMouth).toBe(shouldCover)
      expect(cover.coversEyes).toBe(false)
      writeFileSync(`/opt/cursor/artifacts/fit-${scene.key}-landscape.json`, JSON.stringify({ scene: scene.key, orient: 'landscape', cover, ...fit }, null, 2))
      await page.screenshot({ path: `/opt/cursor/artifacts/scene-${scene.key}-landscape.png` })
      await page.waitForTimeout(scene.rest)
      await expect(page.locator('main')).toHaveAttribute('data-scene', '')
    }
  })
})
