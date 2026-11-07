import { writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const countries = [
  { key: 'uk_guard', at: 4_000, layer: 'prop:uk_big_ben', overlay: 'overlay:uk_guard' },
  { key: 'france_cafe', at: 3_500, layer: 'prop:france_eiffel_tower', overlay: 'overlay:france_cafe' },
  { key: 'usa_eagle', at: 2_200, layer: 'prop:usa_statue_of_liberty', overlay: '' },
  { key: 'egypt_pharaoh', at: 5_500, layer: 'prop:egypt_pyramids', overlay: 'overlay:egypt_pharaoh' },
] as const

async function openApp(page: Page) {
  await page.goto('/?e2e=1&hintMs=0')
  await page.waitForFunction(() => Boolean((window as unknown as { __motionBuddyTest?: unknown }).__motionBuddyTest))
  const skip = page.getByRole('button', { name: 'Not now' })
  if (await skip.count()) await skip.click()
}

test.describe('country scenes', () => {
  test.setTimeout(40_000)

  test('portal is a faint labelled control beside mute', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openApp(page)
    const portal = page.getByRole('button', { name: 'Teleport' })
    await portal.focus()
    await expect(portal).toBeFocused()
    const box = await portal.boundingBox()
    expect(box).toBeTruthy()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await page.mouse.click(200, 420)
    const mute = page.getByRole('button', { name: 'Mute' })
    await expect(mute).toBeVisible()
    const muteBox = await mute.boundingBox()
    expect(muteBox).toBeTruthy()
    const gap = muteBox!.x - (box!.x + box!.width)
    expect(gap).toBeGreaterThanOrEqual(8)
    expect(box!.x + box!.width).toBeLessThanOrEqual(muteBox!.x)
  })

  test('portal starts one country after a short blue lead-in and ignores face gestures', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openApp(page)
    const portal = page.getByRole('button', { name: 'Teleport' })
    const started = Date.now()
    await portal.click()
    await expect(page.locator('main')).toHaveAttribute('data-transition', '1')
    await expect(page.locator('main')).toHaveAttribute('data-lead', '280')
    await expect(portal).toHaveAttribute('aria-disabled', 'true')
    await expect(page.locator('[data-part="portal-bolt"]')).toHaveAttribute('data-on', '1')
    await page.mouse.click(200, 500)
    await expect(page.locator('main')).toHaveAttribute('data-controls', 'closed')
    await expect(page.locator('main')).toHaveAttribute('data-scene', /uk_guard|france_cafe|usa_eagle|egypt_pharaoh/, { timeout: 1_000 })
    const elapsed = Date.now() - started
    expect(elapsed).toBeGreaterThan(180)
    expect(elapsed).toBeLessThan(900)
    await expect(page.locator('main')).toHaveAttribute('data-transition', '0')
    const key = await page.locator('main').getAttribute('data-scene')
    expect(['uk_guard', 'france_cafe', 'usa_eagle', 'egypt_pharaoh']).toContain(key)
    await expect(page.getByRole('button', { name: 'Mute' })).toBeEnabled()
    await page.getByRole('button', { name: 'Mute' }).click()
    await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible()
    await page.getByRole('button', { name: 'Teleport' }).click()
    await expect(page.locator('main')).toHaveAttribute('data-scene', key!)
  })

  test('reduced motion fades blue and does not move a bolt', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await openApp(page)
    await page.getByRole('button', { name: 'Teleport' }).click()
    await expect(page.locator('main')).toHaveAttribute('data-lead', '420')
    await expect(page.locator('[data-part="portal-bolt"]')).toHaveAttribute('data-reduced', '1')
    const animation = await page.locator('[data-part="portal-bolt"]').evaluate((node) => getComputedStyle(node).animationName)
    expect(animation === 'none' || animation === '').toBe(true)
    await expect(page.locator('main')).toHaveAttribute('data-transition', '0', { timeout: 1_200 })
  })

  test('blur cancels the transition and does not restart it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openApp(page)
    const started = await page.evaluate(() => {
      const hook = (window as unknown as { __motionBuddyTest: { playCountry: (key: string) => boolean } }).__motionBuddyTest
      return hook.playCountry('uk_guard')
    })
    expect(started).toBe(true)
    await expect(page.locator('main')).toHaveAttribute('data-transition', '1')
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(page.locator('main')).toHaveAttribute('data-scene', '')
    await expect(page.locator('main')).toHaveAttribute('data-transition', '0')
    await page.waitForTimeout(500)
    await expect(page.locator('main')).toHaveAttribute('data-country', '')
  })

  test('a held finger blocks the next gesture after the country ends', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openApp(page)
    await page.evaluate(() => {
      ;(window as unknown as { __motionBuddyTest: { showCountry: (key: string, ms: number) => boolean } }).__motionBuddyTest.showCountry('france_cafe', 7_850)
    })
    await page.mouse.move(200, 500)
    await page.mouse.down()
    await page.evaluate(() => {
      ;(window as unknown as { __motionBuddyTest: { nudgeCountry: () => boolean } }).__motionBuddyTest.nudgeCountry()
    })
    await expect(page.locator('main')).toHaveAttribute('data-scene', '', { timeout: 1_000 })
    await page.mouse.move(230, 520)
    const contact = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { bedStarts: number } } }).__motionBuddyTest.contact())
    expect(contact.bedStarts).toBe(0)
    await page.mouse.up()
    await expect(page.locator('main')).toHaveAttribute('data-portal', 'ready')
  })

  for (const orient of [
    { name: 'portrait', width: 390, height: 844 },
    { name: 'landscape', width: 844, height: 390 },
  ] as const) {
    test(`${orient.name} shows the real face, landmarks, and open mouth`, async ({ page }) => {
      await page.setViewportSize({ width: orient.width, height: orient.height })
      await openApp(page)
      const shots: string[] = []
      for (const scene of countries) {
        await page.evaluate(({ key, at }) => {
          ;(window as unknown as { __motionBuddyTest: { showCountry: (key: string, ms: number) => boolean } }).__motionBuddyTest.showCountry(key, at)
        }, scene)
        await expect(page.locator('main')).toHaveAttribute('data-scene', scene.key)
        const fit = await page.evaluate(({ layer, overlay, width, height }) => {
          const box = (node: Element | null) => {
            if (!node) return null
            const rect = node.getBoundingClientRect()
            return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }
          }
          const eyes = [...document.querySelectorAll('[data-part="eye-l-path"], [data-part="eye-r-path"]')].map((node) => box(node))
          const mouthNode = document.querySelector('[data-part="mouth"]')
          const mouth = box(mouthNode)
          const face = box(document.querySelector('svg.face'))
          const landmark = document.querySelector(`[data-country-layer="${layer}"]`)
          const costume = overlay ? document.querySelector(`[data-country-layer="${overlay}"]`) : null
          const portal = box(document.querySelector('.portal-chip'))
          const mute = box(document.querySelector('.mute-chip'))
          const hit = (target: { x: number; y: number; right: number; bottom: number } | null) => {
            if (!target) return ''
            const node = document.elementFromPoint((target.x + target.right) / 2, (target.y + target.bottom) / 2)
            return node?.closest('[data-part]')?.getAttribute('data-part') ?? ''
          }
          const overlaps = (a: { x: number; y: number; right: number; bottom: number } | null, b: { x: number; y: number; right: number; bottom: number } | null) =>
            Boolean(a && b && Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1)
          const inside = (target: { x: number; y: number; right: number; bottom: number } | null) =>
            Boolean(target && target.x >= -2 && target.y >= -2 && target.right <= width + 2 && target.bottom <= height + 2 && target.width > 8 && target.height > 8)
          return {
            eyes,
            mouth,
            mouthPath: mouthNode?.getAttribute('d') ?? '',
            eyePath: document.querySelector('[data-part="eye-l-path"]')?.getAttribute('d') ?? '',
            face,
            landmark: box(landmark),
            landmarkOpacity: Number(landmark?.getAttribute('opacity') ?? '0'),
            costume: box(costume),
            costumeOpacity: overlay ? Number(costume?.getAttribute('opacity') ?? '0') : 1,
            eyeHit: hit(eyes[0]),
            mouthHit: hit(mouth),
            portal,
            mute,
            landmarkInside: inside(box(landmark)),
            costumeInside: overlay ? inside(box(costume)) : true,
            eyesInside: eyes.every((eye) => inside(eye)),
            mouthInside: inside(mouth),
            portalClear: !overlaps(box(landmark), portal) && !overlaps(box(costume), portal) && !overlaps(face, portal),
            muteClear: !mute || (!overlaps(box(landmark), mute) && !overlaps(box(costume), mute) && !overlaps(face, mute)),
            hatAboveFace: overlay === 'overlay:uk_guard' ? Boolean(box(costume) && face && box(costume)!.y < face.y - 4) : true,
          }
        }, { ...scene, width: orient.width, height: orient.height })
        expect(fit.eyePath.includes('C'), JSON.stringify(fit)).toBe(true)
        expect(fit.mouthPath.includes('Q')).toBe(true)
        expect(fit.eyesInside).toBe(true)
        expect(fit.mouthInside).toBe(true)
        expect(fit.eyes[0]!.height).toBeGreaterThan(fit.eyes[0]!.width)
        expect(fit.landmarkOpacity).toBeGreaterThan(0.5)
        expect(fit.landmarkInside).toBe(true)
        expect(fit.costumeOpacity).toBeGreaterThan(0.8)
        expect(fit.costumeInside).toBe(true)
        expect(fit.eyeHit).toBe('eye-l-path')
        expect(fit.mouthHit).toBe('mouth')
        expect(fit.portalClear).toBe(true)
        expect(fit.muteClear).toBe(true)
        expect(fit.hatAboveFace).toBe(true)
        const file = `/opt/cursor/artifacts/country-${scene.key}-${orient.name}.png`
        await page.screenshot({ path: file })
        shots.push(file)
        writeFileSync(`/opt/cursor/artifacts/country-${scene.key}-${orient.name}.json`, JSON.stringify(fit, null, 2))
      }
      expect(shots).toHaveLength(4)
    })
  }
})
