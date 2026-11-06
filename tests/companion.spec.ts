import { expect, test, type Page } from '@playwright/test'

type BuddyState = {
  presence: string
  selection: string
  autoSet: string[]
  expression: string
  phase: string
  resting: boolean
  wakefulness: number
  pose: { eyeOpen: number; mouthOpen: number; mouthCurve: number }
  reduced: boolean
  hidden: boolean
}

async function openApp(page: Page, query = 'e2e=1') {
  await page.goto(`/?${query}`)
  await page.waitForFunction(() => Boolean((window as unknown as { __motionBuddyTest?: unknown }).__motionBuddyTest))
}

async function stateOf(page: Page): Promise<BuddyState> {
  return page.evaluate(() => {
    const api = (window as unknown as { __motionBuddyTest: { getState: () => BuddyState } }).__motionBuddyTest
    return api.getState()
  })
}

async function featureBounds(page: Page) {
  return page.evaluate(() => {
    const rects = ['eye-l-path', 'eye-r-path', 'mouth'].map((part) => {
      const node = document.querySelector(`[data-part="${part}"]`)
      const box = node?.getBoundingClientRect()
      return box && box.width > 0.5 && box.height > 0.5 ? box : null
    }).filter((box): box is DOMRect => Boolean(box))
    if (rects.length === 0) throw new Error('eyes and mouth are not drawn')
    const x = Math.min(...rects.map((box) => box.x))
    const y = Math.min(...rects.map((box) => box.y))
    const right = Math.max(...rects.map((box) => box.right))
    const bottom = Math.max(...rects.map((box) => box.bottom))
    return { x, y, width: right - x, height: bottom - y }
  })
}

async function elapse(page: Page, ms: number) {
  await page.evaluate((amount) => {
    ;(window as unknown as { __motionBuddyTest: { elapse: (value: number) => void } }).__motionBuddyTest.elapse(amount)
  }, ms)
}

test('production build does not expose the test hook unless asked', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Motion Buddy/ }).waitFor()
  const exposed = await page.evaluate(
    () => typeof (window as unknown as { __motionBuddyTest?: unknown }).__motionBuddyTest !== 'undefined',
  )
  expect(exposed).toBe(false)
})

test('companion view is black with plain white shapes and hidden controls', async ({ page }) => {
  await openApp(page, 'e2e=1&hintMs=0')
  const paint = await page.locator('main').evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(paint).toBe('rgb(0, 0, 0)')
  await expect(page.locator('[data-part="iris-l"], [data-part="pupil-l"], [data-part="spark-l"]')).toHaveCount(0)
  await expect(page.locator('[data-part="eye-l"]')).toHaveAttribute('fill', '#ffffff')
  await expect(page.locator('[data-part="eye-l"]')).toHaveAttribute('stroke', 'none')
  await expect(page.getByRole('button', { name: 'Happy' })).toHaveCount(0)
  await expect(page.locator('main')).toHaveAttribute('data-accent', 'white')
})

test('face mode has no control panel until a deliberate open', async ({ page }) => {
  await openApp(page)
  await expect(page.getByRole('button', { name: 'Happy' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Enable motion' })).toHaveCount(0)
  await expect(page.getByText('Double-tap or press Enter for controls')).toBeVisible()
  await expect(page.locator('main')).toHaveAttribute('data-controls', 'closed')
  await expect(page.getByTestId('face')).toBeVisible()
})

test('dismissing controls leaves only the face', async ({ page }) => {
  await openApp(page)
  await expect(page.getByTestId('hint')).toBeVisible()
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByTestId('hint')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Happy', exact: true })).toHaveCount(0)
  await expect(page.locator('main')).toHaveAttribute('data-controls', 'closed')
  await expect(page.getByRole('button', { name: /Motion Buddy/ })).toBeFocused()
})

test('the discoverable hint does not stay on the face', async ({ page }) => {
  await openApp(page, 'e2e=1&hintMs=250')
  await expect(page.getByTestId('hint')).toBeVisible()
  await expect(page.getByTestId('hint')).toBeHidden({ timeout: 2_000 })
  await expect(page.getByRole('button', { name: /Motion Buddy/ })).toBeVisible()
})

test('click opens controls and a scrim click closes without changing expression', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await expect(page.getByRole('dialog', { name: 'Controls' })).toBeVisible()
  await expect(page.locator('main')).toHaveAttribute('data-controls', 'open')
  await page.getByRole('button', { name: 'Happy', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await elapse(page, 1_600)
  await expect(page.locator('main')).toHaveAttribute('data-expression', 'happy')
  const curve = Number(await page.locator('main').getAttribute('data-curve'))
  expect(curve).toBeGreaterThan(0.6)
  await page.mouse.click(8, 8)
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('main')).toHaveAttribute('data-expression', 'happy')
  await expect(page.locator('main')).toHaveAttribute('data-controls', 'closed')
  await expect(page.getByRole('button', { name: 'Grumpy', exact: true })).toHaveCount(0)
})

test('keyboard opens and Escape closes', async ({ page }) => {
  await openApp(page, 'e2e=1&hintMs=0')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: /Motion Buddy/ })).toBeFocused()
  await expect(page.getByTestId('hint')).toHaveCount(0)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('button', { name: /Motion Buddy/ })).toBeFocused()
})

test('one tap keeps the menu shut and a double tap opens it', async ({ page }) => {
  await openApp(page, 'e2e=1&hintMs=0')
  const face = page.getByRole('button', { name: /Motion Buddy/ })
  await face.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.waitForTimeout(400)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await face.dblclick()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('a drag looks away from the finger and the mute chip does not poke the face', async ({ page }) => {
  await openApp(page, 'e2e=1&hintMs=0')
  const face = page.getByRole('button', { name: /Motion Buddy/ })
  const box = await face.boundingBox()
  if (!box) throw new Error('face missing')
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width * 0.28, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.08, y)
  await page.waitForTimeout(700)
  await expect(page.getByRole('button', { name: 'Mute' })).toBeVisible()
  const pet = await page.locator('main').getAttribute('data-pet')
  const petX = Number(pet?.split(',')[0] ?? '0')
  expect(petX, `pet=${pet}`).toBeGreaterThan(40)
  const faceBox = await featureBounds(page)
  const view = page.viewportSize()!
  expect(faceBox.x).toBeGreaterThanOrEqual(-2)
  expect(faceBox.y).toBeGreaterThanOrEqual(-2)
  expect(faceBox.x + faceBox.width).toBeLessThanOrEqual(view.width + 2)
  expect(faceBox.y + faceBox.height).toBeLessThanOrEqual(view.height + 2)
  expect(view.width - (faceBox.x + faceBox.width)).toBeLessThan(28)
  await page.screenshot({ path: '/opt/cursor/artifacts/pet-dodge-right.png' })
  await page.mouse.up()
  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size)
    const again = await face.boundingBox()
    if (!again) throw new Error('face missing after resize')
    const midY = again.y + again.height / 2
    await page.mouse.move(again.x + again.width * 0.85, midY)
    await page.mouse.down()
    await page.mouse.move(again.x + again.width * 0.95, midY)
    await page.waitForTimeout(700)
    const box = await featureBounds(page)
    expect(box.x).toBeGreaterThanOrEqual(-2)
    expect(box.y).toBeGreaterThanOrEqual(-2)
    expect(box.x + box.width).toBeLessThanOrEqual(size.width + 2)
    expect(box.y + box.height).toBeLessThanOrEqual(size.height + 2)
    const moved = await page.locator('main').getAttribute('data-pet')
    const petX = Number(moved?.split(',')[0] ?? '0')
    const mode = await page.locator('main').getAttribute('data-pet-mode')
    if (mode === 'chase') expect(petX).toBeGreaterThan(8)
    else expect(petX).toBeLessThan(-8)
    if (petX < 0) expect(box.x).toBeLessThan(24)
    else expect(size.width - (box.x + box.width)).toBeLessThan(28)
    await page.mouse.up()
  }
  await page.mouse.move(24, 80)
  await page.mouse.down()
  await page.mouse.up()
  await page.getByRole('button', { name: 'Mute' }).click()
  await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('a held drag keeps one contact bed and other cues wait', async ({ page }) => {
  await openApp(page, 'e2e=1&hintMs=0')
  const skip = page.getByRole('button', { name: 'Not now' })
  if (await skip.count()) await skip.click()
  const face = page.getByRole('button', { name: /Motion Buddy/ })
  const box = await face.boundingBox()
  if (!box) throw new Error('face missing')
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width * 0.5, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.2, y)
  await page.waitForTimeout(3200)
  const held = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { active: boolean; bedStarts: number; loop: boolean; loopEnd: number; yields: number; liveSources: number } } }).__motionBuddyTest.contact())
  expect(held.active).toBe(true)
  expect(held.bedStarts).toBe(1)
  expect(held.loop).toBe(true)
  expect(held.loopEnd).toBeCloseTo(2.8, 2)
  expect(held.liveSources).toBeLessThanOrEqual(2)
  expect(await page.locator('main')).toHaveAttribute('data-pet-mode', 'dodge')
  const yielded = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { tryCue: (kind: string) => boolean } }).__motionBuddyTest.tryCue('scan'))
  expect(yielded).toBe(false)
  await page.mouse.move(box.x + box.width * 0.8, y)
  await page.waitForTimeout(250)
  await expect(page.locator('main')).toHaveAttribute('data-pet-mode', 'dodge')
  const still = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { bedStarts: number } } }).__motionBuddyTest.contact())
  expect(still.bedStarts).toBe(1)
  await page.mouse.up()
  await page.waitForTimeout(250)
  const released = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { active: boolean; bedStarts: number }; tryCue: (kind: string) => boolean } }).__motionBuddyTest.contact())
  expect(released.active).toBe(false)
  expect(released.bedStarts).toBe(1)
  expect(await page.evaluate(() => (window as unknown as { __motionBuddyTest: { tryCue: (kind: string) => boolean } }).__motionBuddyTest.tryCue('chirp'))).toBe(true)
  await page.mouse.move(box.x + box.width * 0.55, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.7, y)
  await page.waitForTimeout(200)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await page.waitForTimeout(200)
  const blurred = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { active: boolean; bedStarts: number } } }).__motionBuddyTest.contact())
  expect(blurred.active).toBe(false)
  expect(blurred.bedStarts).toBe(2)
  await expect(page.locator('main')).toHaveAttribute('data-pet-mode', 'rest')
  await page.mouse.up()
  await face.click()
  await page.waitForTimeout(400)
  await face.dblclick()
  await expect(page.getByRole('dialog')).toBeVisible()
  const quiet = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { bedStarts: number } } }).__motionBuddyTest.contact())
  expect(quiet.bedStarts).toBe(2)
})

test('chase and dodge stay put, and a drawn touch squashes at the wall', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openApp(page, 'e2e=1&hintMs=0')
  const skip = page.getByRole('button', { name: 'Not now' })
  if (await skip.count()) await skip.click()
  const face = page.getByRole('button', { name: /Motion Buddy/ })
  const dragTo = async (x: number, y: number) => {
    const start = await face.boundingBox()
    if (!start) throw new Error('face missing')
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
    await page.mouse.down()
    await page.mouse.move(x, y, { steps: 12 })
    await page.waitForTimeout(700)
  }
  await dragTo(20, 780)
  await expect(page.locator('main')).toHaveAttribute('data-pet-mode', 'dodge')
  const dodgeBox = await featureBounds(page)
  expect(dodgeBox.x).toBeGreaterThanOrEqual(-2)
  expect(dodgeBox.y).toBeGreaterThanOrEqual(-2)
  expect(dodgeBox.x + dodgeBox.width).toBeLessThanOrEqual(392)
  expect(dodgeBox.y + dodgeBox.height).toBeLessThanOrEqual(846)
  const dodgeScale = Number((await page.locator('main').getAttribute('data-pet'))?.split(',')[2] ?? '1')
  expect(dodgeScale).toBeLessThan(0.95)
  await page.screenshot({ path: '/opt/cursor/artifacts/pet-dodge-corner.png' })
  await page.mouse.up()
  await page.waitForTimeout(800)
  const eye = await page.locator('[data-part="eye-l-path"]').boundingBox()
  if (!eye) throw new Error('eye missing')
  await page.mouse.move(eye.x - 36, eye.y + eye.height / 2)
  await page.mouse.down()
  await page.mouse.move(eye.x + eye.width / 2, eye.y + eye.height / 2, { steps: 8 })
  await page.waitForTimeout(250)
  const landed = await page.locator('[data-part="eye-l-path"]').boundingBox()
  if (!landed) throw new Error('eye missing after the chase')
  await page.mouse.move(landed.x + landed.width / 2, landed.y + landed.height / 2)
  await page.waitForTimeout(400)
  await expect(page.locator('main')).toHaveAttribute('data-pet-mode', 'chase')
  const squeeze = Number(await page.locator('main').getAttribute('data-squeeze'))
  expect(squeeze).toBeLessThan(0.96)
  const variants = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { variantStarts: number; bedStarts: number } } }).__motionBuddyTest.contact())
  expect(variants.variantStarts).toBeGreaterThanOrEqual(1)
  expect(variants.bedStarts).toBe(2)
  await page.mouse.move(landed.x + landed.width / 2 + 3, landed.y + landed.height / 2)
  await page.waitForTimeout(250)
  const held = await page.evaluate(() => (window as unknown as { __motionBuddyTest: { contact: () => { variantStarts: number } } }).__motionBuddyTest.contact())
  expect(held.variantStarts).toBe(variants.variantStarts)
  await page.screenshot({ path: '/opt/cursor/artifacts/pet-squeeze.png' })
  await page.mouse.up()
  await page.waitForTimeout(200)
  await dragTo(370, 800)
  await expect(page.locator('main')).toHaveAttribute('data-pet-mode', 'dodge')
  const chaseWait = await featureBounds(page)
  expect(chaseWait.y).toBeGreaterThanOrEqual(-2)
  expect(chaseWait.y + chaseWait.height).toBeLessThanOrEqual(846)
  await page.mouse.up()
  await page.setViewportSize({ width: 844, height: 390 })
  await page.waitForTimeout(300)
  await dragTo(820, 370)
  await expect(page.locator('main')).toHaveAttribute('data-pet-mode', 'chase')
  const landscape = await featureBounds(page)
  expect(landscape.x).toBeGreaterThanOrEqual(-2)
  expect(landscape.y).toBeGreaterThanOrEqual(-2)
  expect(landscape.x + landscape.width).toBeLessThanOrEqual(846)
  expect(landscape.y + landscape.height).toBeLessThanOrEqual(392)
  const landscapeScale = Number((await page.locator('main').getAttribute('data-pet'))?.split(',')[3] ?? '1')
  expect(landscapeScale).toBeLessThan(0.95)
  await page.screenshot({ path: '/opt/cursor/artifacts/pet-chase-corner.png' })
  await page.mouse.up()
})

test('reduced motion does not travel or squash while a drag is held', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openApp(page, 'e2e=1&hintMs=0')
  const face = page.getByRole('button', { name: /Motion Buddy/ })
  const box = await face.boundingBox()
  if (!box) throw new Error('face missing')
  await page.mouse.move(box.x + 40, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width - 30, box.y + 40)
  await page.waitForTimeout(400)
  const pet = await page.locator('main').getAttribute('data-pet')
  const [x, y, sx, sy] = (pet ?? '').split(',').map(Number)
  expect(Math.abs(x)).toBeLessThan(1)
  expect(Math.abs(y)).toBeLessThan(1)
  expect(sx).toBeGreaterThan(0.98)
  expect(sy).toBeGreaterThan(0.98)
  expect(Number(await page.locator('main').getAttribute('data-squeeze'))).toBeGreaterThan(0.98)
  await page.mouse.up()
})

test('touch wording is used for a coarse pointer', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window)
    window.matchMedia = (query: string) => {
      if (query.includes('pointer') && query.includes('coarse')) {
        return {
          matches: true,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false
          },
        }
      }
      return original(query)
    }
  })
  await openApp(page)
  await expect(page.getByRole('button', { name: 'Motion Buddy. Double-tap for controls.' })).toBeVisible()
  await expect(page.getByText('Double-tap for controls')).toBeVisible()
})

test('Auto can be limited to a chosen subset', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  const extras = ['Grumpy', 'Sleepy', 'Curious', 'Laugh', 'Shy', 'Smug', 'Determined', 'Worried', 'Startled', 'Pant', 'Dizzy', 'Wink', 'Content', 'Yawn']
  for (const name of extras) {
    const toggle = page.getByRole('button', { name: `Use ${name}` })
    if ((await toggle.getAttribute('aria-pressed')) === 'true') await toggle.click()
  }
  await expect(page.getByRole('button', { name: 'Grumpy', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Use Happy' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Use Happy' }).click()
  await expect(page.getByRole('button', { name: 'Use Happy' })).toHaveAttribute('aria-pressed', 'true')
  const after = await page.evaluate(() => {
    const api = (
      window as unknown as {
        __motionBuddyTest: { seek: (ms: number) => void; getState: () => BuddyState }
      }
    ).__motionBuddyTest
    api.seek(20_000)
    return api.getState()
  })
  expect(after.autoSet).toEqual(['happy'])
  expect(after.expression).toBe('happy')
  expect(after.selection).toBe('auto')
})

test('rest stays down until preview wake, then can settle again', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await page.getByRole('button', { name: 'Happy', exact: true }).click()
  await page.getByRole('button', { name: 'Rest until motion' }).click()
  await elapse(page, 1_600)
  await expect(page.locator('main')).toHaveAttribute('data-display', 'resting')
  await expect(page.getByRole('button', { name: 'Preview wake' })).toBeEnabled()
  await page.getByRole('button', { name: 'Preview wake' }).click()
  await elapse(page, 1_400)
  await expect(page.locator('main')).toHaveAttribute('data-display', 'happy')
  const awake = await stateOf(page)
  expect(awake.resting).toBe(false)
  expect(awake.wakefulness).toBeGreaterThan(0.7)
  await page.evaluate(() => {
    const api = (
      window as unknown as {
        __motionBuddyTest: { feedMotion: (level: number) => void; elapse: (ms: number) => void }
      }
    ).__motionBuddyTest
    api.feedMotion(0)
    api.elapse(14_000)
  })
  await expect(page.locator('main')).toHaveAttribute('data-display', 'resting')
  const rested = await stateOf(page)
  expect(rested.resting).toBe(true)
  expect(rested.motionLevel).toBe(0)
})

test('a small fed movement does not wake, a sustained one does', async ({ page }) => {
  await openApp(page)
  await page.evaluate(() => {
    const api = (
      window as unknown as {
        __motionBuddyTest: {
          setPresence: (presence: string) => void
          feedMotion: (level: number) => void
          elapse: (ms: number) => void
          getState: () => BuddyState
        }
      }
    ).__motionBuddyTest
    api.setPresence('rest')
    api.elapse(1_600)
    api.feedMotion(0.15)
    api.elapse(800)
  })
  expect((await stateOf(page)).resting).toBe(true)
  await page.evaluate(() => {
    const api = (
      window as unknown as {
        __motionBuddyTest: { feedMotion: (level: number) => void; elapse: (ms: number) => void }
      }
    ).__motionBuddyTest
    api.feedMotion(1)
    api.elapse(900)
  })
  const woken = await stateOf(page)
  expect(woken.resting).toBe(false)
  expect(woken.wakefulness).toBeGreaterThan(0.5)
})

test('reduced motion still changes expression and rests', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openApp(page)
  await expect(page.locator('main')).toHaveAttribute('data-reduced', 'true')
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await expect(page.getByText(/Calmer motion is on/)).toBeVisible()
  await page.getByRole('button', { name: 'Sleepy', exact: true }).click()
  await elapse(page, 700)
  await expect(page.locator('main')).toHaveAttribute('data-expression', 'sleepy')
  const eyes = Number(await page.locator('main').getAttribute('data-eyes'))
  expect(eyes).toBeLessThan(0.5)
})

test('listening starts on its own when the browser does not require a gesture', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as { __motionSubs: { orientation: number; motion: number } }
    target.__motionSubs = { orientation: 0, motion: 0 }
    const original = EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (this === window && type === 'deviceorientation') target.__motionSubs.orientation += 1
      if (this === window && type === 'devicemotion') target.__motionSubs.motion += 1
      return original.call(this, type, listener, options)
    }
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', { configurable: true, value: undefined })
    Object.defineProperty(DeviceMotionEvent, 'requestPermission', { configurable: true, value: undefined })
  })
  await openApp(page)
  await expect(page.getByRole('button', { name: 'Allow motion' })).toHaveCount(0)
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'waiting')
  const after = await page.evaluate(
    () => (window as unknown as { __motionSubs: { orientation: number; motion: number } }).__motionSubs,
  )
  expect(after.orientation).toBe(1)
  expect(after.motion).toBe(1)
})

test('Allow motion is on the face before any menu, and skipping it does not listen', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as { __motionSubs: { orientation: number; motion: number } }
    target.__motionSubs = { orientation: 0, motion: 0 }
    const original = EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (this === window && type === 'deviceorientation') target.__motionSubs.orientation += 1
      if (this === window && type === 'devicemotion') target.__motionSubs.motion += 1
      return original.call(this, type, listener, options)
    }
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: () => Promise.resolve('granted'),
    })
  })
  await openApp(page, 'e2e=1&hintMs=0')
  await expect(page.getByRole('button', { name: 'Allow motion' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enable motion' })).toHaveCount(0)
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'idle')
  await page.getByRole('button', { name: 'Not now' }).click()
  await expect(page.getByRole('button', { name: 'Allow motion' })).toHaveCount(0)
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'idle')
  const skipped = await page.evaluate(
    () => (window as unknown as { __motionSubs: { orientation: number; motion: number } }).__motionSubs,
  )
  expect(skipped).toEqual({ orientation: 0, motion: 0 })
})

test('denied permission is not described as motion on', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: () => Promise.resolve('denied'),
    })
  })
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await page.getByRole('button', { name: 'Enable motion' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'denied')
  await expect(page.getByText(/permission was denied/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Motion on' })).toHaveCount(0)
})

test('a granted permission without events is not claimed', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: () => Promise.resolve('granted'),
    })
  })
  await openApp(page, 'e2e=1&motionTimeout=700')
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await page.getByRole('button', { name: 'Enable motion' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'waiting')
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'no-events', { timeout: 2_000 })
  await expect(page.getByText(/was not turned on/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Motion on' })).toHaveCount(0)
})

test('motion turns on only after a numeric orientation event', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: () => Promise.resolve('granted'),
    })
  })
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await page.getByRole('button', { name: 'Enable motion' }).click()
  await page.evaluate(() => window.dispatchEvent(new Event('deviceorientation')))
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'waiting')
  await page.evaluate(() => {
    const event = new Event('deviceorientation')
    Object.defineProperty(event, 'gamma', { value: 4 })
    Object.defineProperty(event, 'beta', { value: 40 })
    window.dispatchEvent(event)
  })
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'active')
  await expect(page.getByRole('button', { name: 'Motion on' })).toBeVisible()
  await expect(page.getByText(/events are arriving/)).toBeVisible()
})

test('simulation is labelled and does not mark the sensor on', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await expect(page.getByText('Simulation, not the sensor')).toBeVisible()
  await page.getByRole('button', { name: 'Simulate worried' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-reaction', 'worried')
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'idle')
  await page.evaluate(() => {
    const api = (window as unknown as { __motionBuddyTest: { elapse: (ms: number) => void } }).__motionBuddyTest
    api.elapse(3_000)
  })
  await expect(page.locator('main')).toHaveAttribute('data-reaction', 'none')
})

test('a quicker movement starts dizzy and a turned-off reaction stays off', async ({ page }) => {
  await openApp(page)
  await page.evaluate(() => {
    const api = (window as unknown as {
      __motionBuddyTest: {
        feedAcceleration: (magnitude: number) => void
        elapse: (ms: number) => void
        setReactionEnabled: (kind: string, enabled: boolean) => void
      }
    }).__motionBuddyTest
    api.setReactionEnabled('dizzy', false)
    api.feedAcceleration(8)
    api.elapse(1_000)
  })
  await expect(page.locator('main')).toHaveAttribute('data-reaction', 'none')
  await page.evaluate(() => {
    const api = (window as unknown as {
      __motionBuddyTest: {
        setReactionEnabled: (kind: string, enabled: boolean) => void
        feedAcceleration: (magnitude: number) => void
        elapse: (ms: number) => void
      }
    }).__motionBuddyTest
    api.setReactionEnabled('dizzy', true)
    api.feedAcceleration(0)
    api.elapse(200)
    api.feedAcceleration(8)
    api.elapse(700)
  })
  await expect(page.locator('main')).toHaveAttribute('data-reaction', 'dizzy')
})

test('movement events are recognised only when the numbers arrive', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: () => Promise.resolve('granted'),
    })
  })
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await page.getByRole('button', { name: 'Enable motion' }).click()
  await page.evaluate(() => window.dispatchEvent(new Event('devicemotion')))
  await expect(page.locator('main')).toHaveAttribute('data-movement', 'off')
  await page.evaluate(() => {
    const event = new Event('devicemotion')
    Object.defineProperty(event, 'acceleration', { value: { x: 2.4, y: 0, z: 0 } })
    window.dispatchEvent(event)
  })
  await expect(page.locator('main')).toHaveAttribute('data-movement', 'live')
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'active')
  await expect(page.getByText(/Movement events are arriving/)).toBeVisible()
})

test('hiding the page pauses the engine and tilt listening', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: () => Promise.resolve('granted'),
    })
  })
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await page.getByRole('button', { name: 'Enable motion' }).click()
  await page.evaluate(() => {
    const event = new Event('deviceorientation')
    Object.defineProperty(event, 'gamma', { value: 1 })
    Object.defineProperty(event, 'beta', { value: 20 })
    window.dispatchEvent(event)
  })
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'active')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('main')).toHaveAttribute('data-paused', 'true')
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'paused')
})

test('screen wake lock reports granted, denied, and unsupported without claiming always-on', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: () => Promise.reject(new DOMException('denied', 'NotAllowedError')),
      },
    })
  })
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await page.getByRole('button', { name: 'Keep screen on' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-wake-lock', 'denied')
  await expect(page.getByText(/refused the screen wake lock/)).toBeVisible()
  await page.getByText('Setup and limits').click()
  await expect(page.getByText(/not a system always-on switch/)).toBeVisible()
})

test('screen wake lock can be granted and says it is only for the visible page', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: () =>
          Promise.resolve({
            addEventListener() {},
            release: async () => {},
          }),
      },
    })
  })
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await page.getByRole('button', { name: 'Keep screen on' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-wake-lock', 'granted')
  await expect(page.getByText(/only keeps the screen on while this page is visible|On for this visible page/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stop keeping screen on' })).toBeVisible()
})

test('unsupported wake lock is stated in the controls', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: undefined })
  })
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await expect(page.getByRole('button', { name: 'Screen wake lock unavailable' })).toBeDisabled()
  await expect(page.getByText('This browser has no screen wake lock.')).toBeVisible()
})

async function expectFaceInside(page: Page, minSide: number) {
  const face = await page.getByTestId('face').boundingBox()
  const viewport = page.viewportSize()
  if (!face || !viewport) throw new Error('missing face')
  expect(face.x).toBeGreaterThanOrEqual(8)
  expect(face.y).toBeGreaterThanOrEqual(8)
  expect(face.x + face.width).toBeLessThanOrEqual(viewport.width - 8)
  expect(face.y + face.height).toBeLessThanOrEqual(viewport.height - 8)
  expect(Math.min(face.width, face.height)).toBeGreaterThan(minSide)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  await expect(page.locator('main')).toHaveAttribute('data-controls', 'closed')
}

test('a stationary ten seconds visits several gazes and a readable smile', async ({ page }) => {
  await openApp(page, 'e2e=1&hintMs=0')
  const smile = await page.locator('[data-part="mouth"]').evaluate((node) => {
    const box = (node as SVGGraphicsElement).getBBox()
    return { width: box.width, height: box.height }
  })
  expect(smile.width).toBeGreaterThan(12)
  expect(smile.height).toBeGreaterThan(3)
  const result = await page.evaluate(() => {
    const api = (
      window as unknown as {
        __motionBuddyTest: {
          elapse: (ms: number) => void
          getState: () => { expression: string; gazeX: number; gazeY: number; blink: number }
        }
      }
    ).__motionBuddyTest
    const gazes = new Set<string>()
    const poses = new Set<string>()
    let blinked = false
    for (let step = 0; step < 250; step += 1) {
      api.elapse(40)
      const state = api.getState()
      gazes.add(`${state.gazeX.toFixed(1)},${state.gazeY.toFixed(1)}`)
      poses.add(state.expression)
      if (state.blink > 0.5) blinked = true
    }
    return { gazes: gazes.size, poses: [...poses], blinked }
  })
  expect(result.gazes).toBeGreaterThanOrEqual(3)
  expect(result.poses.length).toBeGreaterThanOrEqual(2)
  expect(result.blinked).toBe(true)
})

test('Desk, Car, and Wrist are real modes and close leaves no hint', async ({ page }) => {
  await openApp(page, 'e2e=1&hintMs=0')
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await expect(page.getByText('Expressive v3.4')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Desk', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Car', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-profile', 'car')
  await expect(page.locator('main')).toHaveAttribute('data-expression', 'determined')
  await expect(page.locator('main')).toHaveAttribute('data-speed', 'on')
  await expect(page.getByText(/not engine RPM/)).toBeVisible()
  await page.getByRole('button', { name: 'Wrist', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-expression', 'pant')
  await expect(page.locator('main')).toHaveAttribute('data-speed', 'off')
  await expect(page.getByText(/not a watch/)).toBeVisible()
  await page.getByRole('button', { name: 'Desk', exact: true }).click()
  await expect(page.locator('main')).toHaveAttribute('data-expression', 'curious')
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByTestId('hint')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Desk', exact: true })).toHaveCount(0)
  await expect(page.locator('main')).toHaveAttribute('data-controls', 'closed')
})

test('reduced motion keeps the new face still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openApp(page, 'e2e=1&hintMs=0')
  const still = await page.evaluate(() => {
    const api = (
      window as unknown as {
        __motionBuddyTest: { elapse: (ms: number) => void; getState: () => { gazeX: number; gazeY: number; blink: number } }
      }
    ).__motionBuddyTest
    api.elapse(3_000)
    return api.getState()
  })
  expect(still.gazeX).toBe(0)
  expect(still.gazeY).toBe(0)
  expect(still.blink).toBe(0)
})

test('everyday eyes stay level and unblushed, and the clean laugh is included', async ({ page }) => {
  await openApp(page, 'e2e=1&hintMs=0')
  await expect(page.locator('[data-part="blush-l"]')).toHaveAttribute('opacity', '0.000')
  const tilt = await page.locator('[data-part="eye-l"]').getAttribute('transform')
  const rot = Number(tilt?.match(/rotate\(([-\d.]+)/)?.[1])
  expect(Math.abs(rot)).toBeLessThanOrEqual(0.5)
  await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
  await expect(page.getByRole('button', { name: 'Use Laugh' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Close' }).click()
  const seen = await page.evaluate(() => {
    const api = (window as unknown as { __motionBuddyTest: { elapse: (ms: number) => void; getState: () => { expression: string } } })
      .__motionBuddyTest
    const poses = new Set<string>()
    for (let step = 0; step < 200; step += 1) {
      api.elapse(200)
      poses.add(api.getState().expression)
    }
    return [...poses]
  })
  expect(seen).toContain('laugh')
  expect(seen).toContain('wink')
  expect(seen.length).toBeGreaterThan(3)
})

test('an expression change travels through the current face', async ({ page }) => {
  await openApp(page, 'e2e=1&hintMs=0')
  const result = await page.evaluate(() => {
    const api = (window as unknown as { __motionBuddyTest: { setSelection: (value: string) => void; elapse: (ms: number) => void } })
      .__motionBuddyTest
    const read = () => Number(document.querySelector('main')?.getAttribute('data-eye-h'))
    const start = read()
    api.setSelection('happy')
    const immediate = read()
    api.elapse(120)
    const mid = read()
    api.elapse(700)
    const settled = read()
    return { start, immediate, mid, settled }
  })
  expect(result.immediate).toBeCloseTo(result.start, 0)
  expect(result.mid).toBeLessThan(result.start - 3)
  expect(result.mid).toBeGreaterThan(result.settled + 3)
  expect(result.settled).toBeLessThan(12)
})

test('opposite simulated shoves move the rendered face to opposite sides', async ({ page }) => {
  await openApp(page, 'e2e=1&hintMs=0')
  const read = () => page.locator('[data-part="glance"]').getAttribute('transform').then((value) => Number(value?.match(/translate\(([-\d.]+)/)?.[1]))
  await page.evaluate(() => {
    const api = (window as unknown as { __motionBuddyTest: { feedLook: (x: number, y: number) => void; feedAcceleration: (magnitude: number, lateral?: number) => void; elapse: (ms: number) => void } }).__motionBuddyTest
    api.feedLook(-1, 0)
    api.feedAcceleration(2, -1)
    api.elapse(900)
  })
  const left = await read()
  await page.evaluate(() => {
    const api = (window as unknown as { __motionBuddyTest: { feedLook: (x: number, y: number) => void; feedAcceleration: (magnitude: number, lateral?: number) => void; elapse: (ms: number) => void } }).__motionBuddyTest
    api.feedLook(1, 0)
    api.feedAcceleration(2, 1)
    api.elapse(520)
  })
  const right = await read()
  expect(left).toBeLessThan(-12)
  expect(right).toBeGreaterThan(12)
})

test('a full look moves the rendered face by a clearly visible amount', async ({ page }) => {
  await openApp(page, 'e2e=1&hintMs=0')
  await page.evaluate(() => {
    const api = (window as unknown as { __motionBuddyTest: { feedLook: (x: number, y: number) => void; elapse: (ms: number) => void } })
      .__motionBuddyTest
    api.feedLook(1, 0)
    api.elapse(800)
  })
  const transform = await page.locator('[data-part="glance"]').getAttribute('transform')
  const x = Number(transform?.match(/translate\(([-\d.]+)/)?.[1])
  expect(x).toBeGreaterThan(12)
  const reported = Number(await page.locator('main').getAttribute('data-glance-x'))
  expect(reported).toBeGreaterThan(12)
})

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('keeps a large unclipped face and large controls', async ({ page }) => {
    await openApp(page, 'e2e=1&hintMs=0')
    await expectFaceInside(page, 180)
    await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
    const button = await page.getByRole('button', { name: 'Curious', exact: true }).boundingBox()
    expect(button?.height).toBeGreaterThanOrEqual(48)
    await expect(page.getByText('Setup and limits')).toBeVisible()
  })
})

test.describe('phone landscape', () => {
  test.use({ viewport: { width: 844, height: 390 } })
  test('keeps the face inside the short screen', async ({ page }) => {
    await openApp(page, 'e2e=1&hintMs=0')
    await expectFaceInside(page, 140)
  })
})

test.describe('square watch-like', () => {
  test.use({ viewport: { width: 320, height: 320 } })
  test('keeps the face inside a square with usable controls', async ({ page }) => {
    await openApp(page, 'e2e=1&hintMs=0')
    await expectFaceInside(page, 120)
    await page.getByRole('button', { name: /Motion Buddy/ }).dblclick()
    const close = await page.getByRole('button', { name: 'Close' }).boundingBox()
    expect(close?.height).toBeGreaterThanOrEqual(44)
    await expect(page.getByRole('button', { name: 'Close' })).toBeInViewport()
  })
})

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })
  test('centers a large face in the calm page', async ({ page }) => {
    await openApp(page, 'e2e=1&hintMs=0')
    await expectFaceInside(page, 280)
    const face = await page.getByTestId('face').boundingBox()
    if (!face) throw new Error('missing face')
    expect(face.x).toBeGreaterThan(120)
    expect(face.x + face.width).toBeLessThan(1160)
  })
})
