import { expect, test, type Page } from '@playwright/test'

type BramState = {
  mode: string
  blend: number
  settled: string
  phase: string
  lean: number
  bounce: number
  reduced: boolean
  sway: boolean
  sensor: boolean
}

async function openApp(page: Page, query = 'e2e=1') {
  await page.goto(`/?${query}`)
  await page.waitForFunction(() => Boolean((window as unknown as { __bramTest?: unknown }).__bramTest))
}

async function stateOf(page: Page): Promise<BramState> {
  return page.evaluate(() => {
    const api = (window as unknown as { __bramTest: { getState: () => BramState } }).__bramTest
    return api.getState()
  })
}

async function seek(page: Page, ms: number): Promise<BramState> {
  return page.evaluate((elapsed) => {
    const api = (
      window as unknown as { __bramTest: { seek: (value: number) => void; getState: () => BramState } }
    ).__bramTest
    api.seek(elapsed)
    return api.getState()
  }, ms)
}

test('production build does not expose the test clock unless asked', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('heading', { name: 'Bram' }).waitFor()
  const exposed = await page.evaluate(
    () => typeof (window as unknown as { __bramTest?: unknown }).__bramTest !== 'undefined',
  )
  expect(exposed).toBe(false)
})

test('manual moods settle on one character', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: 'Grumpy' }).click()
  await expect
    .poll(async () => (await stateOf(page)).blend, { timeout: 4_000 })
    .toBeGreaterThan(0.98)
  await expect(page.getByRole('button', { name: 'Grumpy' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('main')).toHaveAttribute('data-settled', 'grumpy')
  await expect(page.locator('.readout')).toHaveText('A little grumpy')
  const frown = await page.locator('[data-part="mouth-frown"]').evaluate((node) => Number(getComputedStyle(node).opacity))
  expect(frown).toBeGreaterThan(0.9)

  await page.getByRole('button', { name: 'Curious' }).click()
  await expect
    .poll(async () => (await stateOf(page)).blend, { timeout: 4_000 })
    .toBeLessThan(0.02)
  await expect(page.getByRole('button', { name: 'Curious' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.readout')).toHaveText('Curious')
  const open = await page.locator('[data-part="mouth-open"]').evaluate((node) => Number(getComputedStyle(node).opacity))
  expect(open).toBeGreaterThan(0.9)
})

test('auto mood follows the test clock', async ({ page }) => {
  await openApp(page)
  const curious = await seek(page, 4_000)
  expect(curious.mode).toBe('auto')
  expect(curious.phase).toBe('dwell')
  expect(curious.settled).toBe('curious')
  expect(curious.blend).toBe(0)
  await expect(page.locator('main')).toHaveAttribute('data-blend', '0.000')

  const shifting = await seek(page, 14_000 + 900)
  expect(shifting.phase).toBe('transition')
  expect(shifting.blend).toBeGreaterThan(0.4)
  expect(shifting.blend).toBeLessThan(0.6)
  await expect(page.locator('.readout')).toHaveText('Shifting')

  const grumpy = await seek(page, 14_000 + 1_800 + 2_000)
  expect(grumpy.phase).toBe('dwell')
  expect(grumpy.settled).toBe('grumpy')
  expect(grumpy.blend).toBe(1)
  await expect(page.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true')
})

test('pointer lean is gentle and preview sway can be stopped', async ({ page }) => {
  await openApp(page)
  const box = await page.locator('main').boundingBox()
  if (!box) throw new Error('missing stage')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.move(box.x + box.width - 8, box.y + box.height / 2)
  await expect.poll(async () => (await stateOf(page)).lean, { timeout: 2_000 }).toBeGreaterThan(0.12)
  const leaned = await stateOf(page)
  expect(leaned.lean).toBeLessThanOrEqual(1)
  expect(leaned.sensor).toBe(false)

  await page.getByRole('button', { name: 'Preview sway' }).click()
  await expect(page.getByRole('button', { name: 'Stop sway' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Stop sway' }).click()
  await expect(page.getByRole('button', { name: 'Preview sway' })).toHaveAttribute('aria-pressed', 'false')
})

test('reduced motion keeps a quiet pose and disables sway', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openApp(page)
  await expect(page.locator('main')).toHaveAttribute('data-reduced', 'true')
  await expect(page.getByText(/quieter pose/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preview sway' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Enable motion' })).toBeDisabled()

  const box = await page.locator('main').boundingBox()
  if (!box) throw new Error('missing stage')
  await page.mouse.move(box.x + 4, box.y + box.height / 2)
  await page.waitForTimeout(350)
  const state = await stateOf(page)
  expect(state.reduced).toBe(true)
  expect(state.bounce).toBe(0)
  expect(Math.abs(state.lean)).toBeLessThan(0.05)

  await page.getByRole('button', { name: 'Grumpy' }).click()
  await expect.poll(async () => (await stateOf(page)).blend, { timeout: 2_000 }).toBeGreaterThan(0.98)
})

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('puts the character above large controls', async ({ page }) => {
    await openApp(page)
    const face = await page.getByTestId('bram').boundingBox()
    const dock = await page.getByTestId('dock').boundingBox()
    if (!face || !dock) throw new Error('missing layout')
    expect(dock.y).toBeGreaterThan(face.y + face.height - 8)
    expect(face.height).toBeGreaterThan(240)
    for (const name of ['Auto', 'Curious', 'Grumpy']) {
      const button = await page.getByRole('button', { name }).boundingBox()
      expect(button?.height).toBeGreaterThanOrEqual(48)
      expect(button?.width).toBeGreaterThanOrEqual(72)
    }
    await expect(page.getByText('Stationary prototype — set up while parked.')).toBeVisible()
    await expect(page.getByText(/not been measured/)).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})

test.describe('phone landscape', () => {
  test.use({ viewport: { width: 844, height: 390 } })

  test('puts controls beside the character', async ({ page }) => {
    await openApp(page)
    const face = await page.getByTestId('bram').boundingBox()
    const dock = await page.getByTestId('dock').boundingBox()
    if (!face || !dock) throw new Error('missing layout')
    expect(dock.x).toBeGreaterThan(face.x + face.width * 0.55)
    expect(face.height).toBeGreaterThan(180)
    for (const name of ['Auto', 'Curious', 'Grumpy', 'Enable motion']) {
      const button = await page.getByRole('button', { name }).boundingBox()
      expect(button?.height).toBeGreaterThanOrEqual(44)
    }
    await expect(page.getByText('Stationary prototype — set up while parked.')).toBeInViewport()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('keeps Bram centered in a calm page', async ({ page }) => {
    await openApp(page)
    const face = await page.getByTestId('bram').boundingBox()
    if (!face) throw new Error('missing character')
    expect(face.x).toBeGreaterThan(180)
    expect(face.x + face.width).toBeLessThan(1100)
    expect(face.height).toBeGreaterThan(280)
    await expect(page.getByText('Same lantern, two moods. Auto swaps them slowly.')).toBeVisible()
  })
})

test('does not subscribe to tilt until Enable motion', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as unknown as { __motionSubs: { orientation: number; motion: number } }
    target.__motionSubs = { orientation: 0, motion: 0 }
    const original = EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      if (this === window && type === 'deviceorientation') target.__motionSubs.orientation += 1
      if (this === window && type === 'devicemotion') target.__motionSubs.motion += 1
      return original.call(this, type, listener, options)
    }
    // This check is the desktop path: orientation exists, but there is no permission prompt.
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(DeviceMotionEvent, 'requestPermission', {
      configurable: true,
      value: undefined,
    })
  })
  await openApp(page)
  const before = await page.evaluate(
    () => (window as unknown as { __motionSubs: { orientation: number; motion: number } }).__motionSubs,
  )
  expect(before).toEqual({ orientation: 0, motion: 0 })
  await page.getByRole('button', { name: 'Enable motion' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'waiting')
  const after = await page.evaluate(
    () => (window as unknown as { __motionSubs: { orientation: number; motion: number } }).__motionSubs,
  )
  expect(after.orientation).toBe(1)
  expect(after.motion).toBe(0)
})

test('denied permission is not described as motion on', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: () => Promise.resolve('denied'),
    })
  })
  await openApp(page)
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
  await openApp(page, 'e2e=1&motionTimeout=800')
  await page.getByRole('button', { name: 'Enable motion' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'waiting')
  await expect(page.getByRole('button', { name: 'Motion on' })).toHaveCount(0)
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
    const target = window as unknown as { __motionSubs: { motion: number } }
    target.__motionSubs = { motion: 0 }
    const original = EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      if (this === window && type === 'devicemotion') target.__motionSubs.motion += 1
      return original.call(this, type, listener, options)
    }
  })
  await openApp(page)
  await page.getByRole('button', { name: 'Enable motion' }).click()
  await page.evaluate(() => {
    window.dispatchEvent(new Event('deviceorientation'))
  })
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'waiting')

  await page.evaluate(() => {
    const event = new Event('deviceorientation')
    Object.defineProperty(event, 'gamma', { value: 2 })
    Object.defineProperty(event, 'beta', { value: 40 })
    window.dispatchEvent(event)
  })
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'active')
  await expect(page.getByRole('button', { name: 'Motion on' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Set level' })).toBeVisible()

  await page.evaluate(() => {
    const event = new Event('deviceorientation')
    Object.defineProperty(event, 'gamma', { value: 24 })
    Object.defineProperty(event, 'beta', { value: 40 })
    window.dispatchEvent(event)
  })
  await expect.poll(async () => (await stateOf(page)).lean, { timeout: 2_000 }).toBeGreaterThan(0.45)
  const subs = await page.evaluate(
    () => (window as unknown as { __motionSubs: { motion: number } }).__motionSubs.motion,
  )
  expect(subs).toBe(0)
  const leaned = await stateOf(page)
  expect(leaned.sensor).toBe(true)
  expect(leaned.lean).toBeLessThanOrEqual(1)
})
