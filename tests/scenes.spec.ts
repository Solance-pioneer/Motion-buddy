import { expect, test, type Page } from '@playwright/test'

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
      await expect(page.locator(`[data-costume="${scene.key}"]`)).toHaveAttribute('opacity', '0')
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
    await page.setViewportSize({ width: 844, height: 390 })
    await openApp(page)
    for (const scene of [
      { key: 'ninja', hold: 2_400 },
      { key: 'sheet_ghost', hold: 3_200 },
    ]) {
      await play(page, scene.key)
      await page.waitForTimeout(scene.hold)
      const box = await maskBox(page, scene.key)
      expect(box!.x).toBeGreaterThanOrEqual(-2)
      expect(box!.y).toBeGreaterThanOrEqual(-2)
      expect(box!.right).toBeLessThanOrEqual(846)
      expect(box!.bottom).toBeLessThanOrEqual(392)
      await page.screenshot({ path: `/opt/cursor/artifacts/scene-${scene.key}-landscape.png` })
      await page.waitForTimeout(scene.key === 'ninja' ? 4_000 : 5_000)
      await expect(page.locator('main')).toHaveAttribute('data-scene', '')
    }
  })
})
