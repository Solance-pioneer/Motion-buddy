import { writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { publishedEyeAgrees } from '../src/logic/opening-fit.ts'

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
    const read = () => page.evaluate(() => {
      const main = document.querySelector('main')
      const chip = document.querySelector('.portal-chip')
      const box = chip?.getBoundingClientRect()
      const hook = (window as unknown as { __motionBuddyTest?: { contact: () => { bedStarts: number }; tryCue: (kind: string) => boolean; sceneAudio: () => { active: boolean } } }).__motionBuddyTest
      return {
        scene: main?.getAttribute('data-scene') ?? '',
        country: main?.getAttribute('data-country') ?? '',
        transition: main?.getAttribute('data-transition') ?? '',
        ms: Number(main?.getAttribute('data-scene-ms') ?? '0'),
        lead: main?.getAttribute('data-lead') ?? '',
        disabled: chip?.getAttribute('aria-disabled') ?? '',
        bolt: document.querySelector('[data-part="portal-bolt"]')?.getAttribute('data-on') ?? '',
        boltReduced: document.querySelector('[data-part="portal-bolt"]')?.getAttribute('data-reduced') ?? '',
        controls: main?.getAttribute('data-controls') ?? '',
        x: box?.x ?? 0,
        y: box?.y ?? 0,
        width: box?.width ?? 0,
        height: box?.height ?? 0,
        beds: hook?.contact().bedStarts ?? -1,
        audio: hook?.sceneAudio().active ?? false,
      }
    })
    // Role click is only the first press, while Teleport is enabled. Later presses are pointer
    // hits. A role click waits until aria-disabled clears and would start the next country.
    const started = Date.now()
    await portal.click()
    await page.waitForFunction(() => document.querySelector('main')?.getAttribute('data-transition') === '1')
    const lead = await read()
    expect(lead.lead).toBe('280')
    expect(lead.bolt).toBe('1')
    expect(lead.boltReduced).toBe('0')
    expect(lead.disabled).toBe('true')
    expect(lead.width).toBeGreaterThanOrEqual(44)
    expect(['uk_guard', 'france_cafe', 'usa_eagle', 'egypt_pharaoh']).toContain(lead.country)
    await page.mouse.click(lead.x + lead.width / 2, lead.y + lead.height / 2)
    const duringLead = await read()
    expect(duringLead.country).toBe(lead.country)
    expect(duringLead.scene === '' || duringLead.scene === lead.country).toBe(true)
    await page.mouse.click(200, 500)
    await expect(page.locator('main')).toHaveAttribute('data-controls', 'closed')
    await expect(page.locator('main')).toHaveAttribute('data-scene', lead.country, { timeout: 1_000 })
    const elapsed = Date.now() - started
    expect(elapsed).toBeGreaterThan(180)
    expect(elapsed).toBeLessThan(900)
    const active = await read()
    expect(active.transition).toBe('0')
    expect(active.disabled).toBe('true')
    expect(active.audio).toBe(true)
    await page.mouse.click(active.x + active.width / 2, active.y + active.height / 2)
    await page.mouse.dblclick(200, 520)
    await page.waitForTimeout(300)
    const held = await read()
    expect(held.scene).toBe(lead.country)
    expect(held.country).toBe(lead.country)
    expect(held.transition).toBe('0')
    expect(held.ms).toBeGreaterThan(active.ms)
    expect(held.controls).toBe('closed')
    expect(held.beds).toBe(active.beds)
    expect(held.audio).toBe(true)
    const cue = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { tryCue: (kind: string) => boolean } }).__motionBuddyTest.tryCue('scan'))
    expect(cue).toBe(false)
    await expect(page.getByRole('button', { name: 'Mute' })).toBeEnabled()
    await page.getByRole('button', { name: 'Mute' }).click()
    await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible()
    const muted = await read()
    await page.mouse.click(muted.x + muted.width / 2, muted.y + muted.height / 2)
    await page.waitForTimeout(200)
    const afterMute = await read()
    expect(afterMute.scene).toBe(lead.country)
    expect(afterMute.transition).toBe('0')
    expect(afterMute.ms).toBeGreaterThan(muted.ms)
    expect(afterMute.audio).toBe(false)
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
          const pathExtent = (d: string) => {
            const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
            const xs = nums.filter((_, index) => index % 2 === 0)
            const ys = nums.filter((_, index) => index % 2 === 1)
            if (!xs.length || !ys.length) return null
            const x = Math.min(...xs)
            const y = Math.min(...ys)
            const right = Math.max(...xs)
            const bottom = Math.max(...ys)
            return { x, y, right, bottom, width: right - x, height: bottom - y }
          }
          const eyes = [...document.querySelectorAll('[data-part="eye-l-path"], [data-part="eye-r-path"]')].map((node) => {
            const path = node.getAttribute('d') ?? ''
            return { part: node.getAttribute('data-part'), path, authored: pathExtent(path), rendered: box(node) }
          })
          const mouthNode = document.querySelector('[data-part="mouth"]')
          const mouthPath = mouthNode?.getAttribute('d') ?? ''
          const mouth = box(mouthNode)
          const mouthAuthored = pathExtent(mouthPath)
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
          const finitePositive = (target: { x: number; y: number; right: number; bottom: number; width: number; height: number } | null) =>
            Boolean(target && target.width > 0 && target.height > 0 && [target.x, target.y, target.right, target.bottom, target.width, target.height].every((value) => Number.isFinite(value)))
          const inViewport = (target: { x: number; y: number; right: number; bottom: number } | null) =>
            Boolean(target && target.x >= -2 && target.y >= -2 && target.right <= width + 2 && target.bottom <= height + 2)
          const substantial = (target: { width: number; height: number } | null) => Boolean(target && target.width > 8 && target.height > 8)
          return {
            eyes,
            mouth,
            mouthAuthored,
            mouthPath,
            eyePath: eyes[0]?.path ?? '',
            blink: document.querySelector('main')?.getAttribute('data-blink') ?? '',
            eyeH: document.querySelector('main')?.getAttribute('data-eye-h') ?? '',
            scene: document.querySelector('main')?.getAttribute('data-scene') ?? '',
            face,
            landmark: box(landmark),
            landmarkOpacity: Number(landmark?.getAttribute('opacity') ?? '0'),
            costume: box(costume),
            costumeOpacity: overlay ? Number(costume?.getAttribute('opacity') ?? '0') : 1,
            eyeHit: hit(eyes[0]?.rendered ?? null),
            mouthHit: hit(mouth),
            portal,
            mute,
            landmarkInside: Boolean(substantial(box(landmark)) && inViewport(box(landmark))),
            costumeInside: overlay ? Boolean(substantial(box(costume)) && inViewport(box(costume))) : true,
            eyesAuthored: eyes.every((eye) => {
              const nums = eye.path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
              const cubics = eye.path.match(/C/g)?.length ?? 0
              const eyeH = Number(document.querySelector('main')?.getAttribute('data-eye-h') ?? '0')
              if (cubics !== 4 || !eye.path.trim().endsWith('Z') || nums.length < 26 || !finitePositive(eye.authored)) return false
              const cx = nums[0]
              const yTop = nums[1]
              const rx = nums[6] - cx
              const kx = nums[2] - cx
              const ySide = nums[7]
              const yBot = nums[13]
              const left = nums[18]
              const kappa = rx === 0 ? 0 : kx / rx
              const height = yBot - yTop
              const peaked = Math.abs(ySide - (yTop + yBot) / 2) > 0.4
              const matchesPose = peaked ? height >= 2.1 && height <= eyeH + 0.8 : Math.abs(height - Math.max(1.6, eyeH)) < 0.8
              return rx > 0 && Math.abs(kappa - 0.5522847498) < 0.03 && Math.abs(cx - left - rx) < 0.35 && matchesPose
            }),
            eyesInside: eyes.every((eye) => finitePositive(eye.rendered) && inViewport(eye.rendered)),
            mouthAuthoredOk: mouthPath.includes('Q') && mouthPath.trim().endsWith('Z') && finitePositive(mouthAuthored),
            mouthInside: Boolean(finitePositive(mouth) && inViewport(mouth)),
            portalClear: !overlaps(box(landmark), portal) && !overlaps(box(costume), portal) && !overlaps(face, portal),
            muteClear: !mute || (!overlaps(box(landmark), mute) && !overlaps(box(costume), mute) && !overlaps(face, mute)),
            hatAboveFace: overlay === 'overlay:uk_guard' ? Boolean(box(costume) && face && box(costume)!.y < face.y - 4) : true,
            registration: (() => {
              const svg = document.querySelector('svg.face') as SVGSVGElement | null
              const glance = document.querySelector('[data-part="glance"]')
              const match = /translate\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/.exec(glance?.getAttribute('transform') || '')
              const gx = match ? Number(match[1]) : 0
              const gy = match ? Number(match[2]) : 0
              let dx = 0
              let dy = 0
              if (svg) {
                const origin = svg.createSVGPoint()
                const shifted = svg.createSVGPoint()
                shifted.x = gx
                shifted.y = gy
                const ctm = svg.getScreenCTM()
                if (ctm) {
                  const a = origin.matrixTransform(ctm)
                  const b = shifted.matrixTransform(ctm)
                  dx = b.x - a.x
                  dy = b.y - a.y
                }
              }
              const unglance = (target: { x: number; y: number; right: number; bottom: number; width: number; height: number } | null) =>
                target ? { ...target, x: target.x - dx, right: target.right - dx, y: target.y - dy, bottom: target.bottom - dy } : null
              const screenPts = (node: SVGGeometryElement | null) => {
                if (!node?.getTotalLength) return []
                const len = node.getTotalLength()
                const ctm = node.getScreenCTM()
                if (!ctm || len <= 0) return []
                const pts = []
                for (let i = 0; i <= 72; i += 1) {
                  const point = node.getPointAtLength((len * i) / 72).matrixTransform(ctm)
                  pts.push({ x: point.x, y: point.y })
                }
                return pts
              }
              const hits = (target: { x: number; y: number; right: number; bottom: number } | null, pts: { x: number; y: number }[]) =>
                Boolean(target && pts.some((point) => point.x >= target.x && point.x <= target.right && point.y >= target.y && point.y <= target.bottom))
              const spanAt = (y: number, pts: { x: number; y: number }[]) => {
                const band = pts.filter((point) => Math.abs(point.y - y) < 16)
                if (band.length < 2) return null
                return { left: Math.min(...band.map((point) => point.x)), right: Math.max(...band.map((point) => point.x)) }
              }
              const outline = screenPts(document.querySelector('[data-part="uk-outline"]'))
              const eyesU = eyes.map((eye) => unglance(eye.rendered))
              const mouthU = unglance(mouth)
              const framed = (target: { x: number; y: number; right: number; bottom: number } | null) => {
                if (!target) return false
                const span = spanAt((target.y + target.bottom) / 2, outline)
                return Boolean(span && target.x > span.left + 1 && target.right < span.right - 1 && !hits(target, outline))
              }
              const crown = document.querySelector('[data-part="uk-crown"]') as SVGGraphicsElement | null
              const crownBox = crown?.getBBox()
              const flag = box(document.querySelector('[data-country-layer="prop:us_flag"]'))
              const beret = box(document.querySelector('[data-part="france-beret"]'))
              const ascot = box(document.querySelector('[data-part="france-ascot"]'))
              const opening = box(document.querySelector('[data-part="egypt-opening"]'))
              const inside = (inner: { x: number; y: number; right: number; bottom: number } | null, outer: { x: number; y: number; right: number; bottom: number } | null) =>
                Boolean(inner && outer && inner.x >= outer.x - 1 && inner.y >= outer.y - 1 && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1)
              return {
                glance: { x: gx, y: gy },
                crownTop: crownBox?.y ?? null,
                outline,
                strokePad: (() => {
                  const node = document.querySelector('[data-part="uk-outline"]') as SVGGeometryElement | null
                  const width = Number(node?.getAttribute('stroke-width') ?? '0')
                  const ctm = node?.getScreenCTM()
                  if (!node || !ctm) return 0
                  const origin = new DOMPoint(0, 0).matrixTransform(ctm)
                  const tip = new DOMPoint(width / 2, 0).matrixTransform(ctm)
                  return Math.hypot(tip.x - origin.x, tip.y - origin.y)
                })(),
                drawnEyes: eyes.map((eye) => eye.rendered),
                drawnMouth: mouth,
                mouthAboveFlag: Boolean(mouth && flag && flag.height > 8 && mouth.bottom + 4 < flag.y),
                beretAboveEyes: Boolean(beret && eyesU.every((eye) => eye && eye.y > beret.bottom - 1)),
                ascotBelowMouth: Boolean(ascot && mouth && ascot.y > mouth.bottom - 1),
                egyptFaceInside: Boolean(opening && eyesU.every((eye) => inside(eye, opening)) && inside(mouthU, opening)),
              }
            })(),
          }
        }, { ...scene, width: orient.width, height: orient.height })
        const evidence = `${scene.key} blink=${fit.blink} eyeH=${fit.eyeH} ${JSON.stringify(fit.eyes)} mouth=${JSON.stringify(fit.mouth)}`
        writeFileSync(`/opt/cursor/artifacts/country-${scene.key}-${orient.name}.json`, JSON.stringify(fit, null, 2))
        await page.screenshot({ path: `/opt/cursor/artifacts/country-${scene.key}-${orient.name}.png` })
        expect(fit.eyes.every((eye) => publishedEyeAgrees(eye.path, Number(fit.eyeH))), evidence).toBe(true)
        expect(fit.eyesInside, evidence).toBe(true)
        expect(fit.mouthAuthoredOk, evidence).toBe(true)
        expect(fit.mouthInside, evidence).toBe(true)
        expect(fit.landmarkOpacity).toBeGreaterThan(0.5)
        expect(fit.landmarkInside).toBe(true)
        expect(fit.costumeOpacity).toBeGreaterThan(0.8)
        expect(fit.costumeInside).toBe(true)
        expect(fit.eyeHit).toBe('eye-l-path')
        expect(fit.mouthHit).toBe('mouth')
        expect(fit.portalClear).toBe(true)
        expect(fit.muteClear).toBe(true)
        expect(fit.hatAboveFace, evidence).toBe(true)
        if (scene.key === 'uk_guard') {
          const crown = await page.locator('[data-part="uk-crown"]').getAttribute('d')
          const outline = await page.locator('[data-part="uk-outline"]').getAttribute('d')
          expect(crown).toContain('M96 132')
          expect(crown).toContain('C138 -57 222 -57')
          expect(outline).toContain('M90 134')
          await expect(page.locator('[data-part="uk-stud"]')).toHaveCount(2)
          const worn = await page.locator('[data-part="glance"]').getAttribute('transform')
          expect(worn).toContain('scale(0.5)')
          expect(fit.registration.crownTop).toBeLessThan(-40)
          expect(fit.registration.crownTop).toBeGreaterThan(-60)
          await page.evaluate(() => {
            const hook = (window as unknown as { __motionBuddyTest: { showCountry: (key: string, ms: number) => boolean; nudgeCountry: () => boolean } }).__motionBuddyTest
            hook.showCountry('uk_guard', 7_900)
            hook.nudgeCountry()
          })
          await expect(page.locator('main')).toHaveAttribute('data-scene', '', { timeout: 2_000 })
          const restored = await page.locator('[data-part="glance"]').getAttribute('transform')
          expect(restored ?? '').not.toContain('scale(0.5)')
        }
        if (scene.key === 'usa_eagle') expect(fit.registration.mouthAboveFlag, evidence).toBe(true)
        if (scene.key === 'france_cafe') {
          expect(fit.registration.beretAboveEyes, evidence).toBe(true)
          expect(fit.registration.ascotBelowMouth, evidence).toBe(true)
        }
        if (scene.key === 'egypt_pharaoh') expect(fit.registration.egyptFaceInside, evidence).toBe(true)
        shots.push(`/opt/cursor/artifacts/country-${scene.key}-${orient.name}.png`)
      }
      expect(shots).toHaveLength(4)
    })
  }
})
