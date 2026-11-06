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
  await expect(page.getByText('Click or press Enter for controls')).toBeVisible()
  await expect(page.locator('main')).toHaveAttribute('data-controls', 'closed')
  await expect(page.getByTestId('face')).toBeVisible()
})

test('dismissing controls leaves only the face', async ({ page }) => {
  await openApp(page)
  await expect(page.getByTestId('hint')).toBeVisible()
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
  await expect(page.getByRole('button', { name: 'Motion Buddy. Tap for controls.' })).toBeVisible()
  await expect(page.getByText('Tap for controls')).toBeVisible()
})

test('Auto can be limited to a chosen subset', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
  const extras = ['Grumpy', 'Sleepy', 'Curious', 'Laugh', 'Shy', 'Smug', 'Determined', 'Worried', 'Startled', 'Pant', 'Dizzy']
  for (const name of extras) await page.getByRole('button', { name: `Use ${name}` }).click()
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
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
  await expect(page.getByText(/Calmer motion is on/)).toBeVisible()
  await page.getByRole('button', { name: 'Sleepy', exact: true }).click()
  await elapse(page, 700)
  await expect(page.locator('main')).toHaveAttribute('data-expression', 'sleepy')
  const eyes = Number(await page.locator('main').getAttribute('data-eyes'))
  expect(eyes).toBeLessThan(0.5)
})

test('does not subscribe to tilt until Enable motion', async ({ page }) => {
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
  const before = await page.evaluate(
    () => (window as unknown as { __motionSubs: { orientation: number; motion: number } }).__motionSubs,
  )
  expect(before).toEqual({ orientation: 0, motion: 0 })
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
  await page.getByRole('button', { name: 'Enable motion' }).click()
  await expect(page.locator('main')).toHaveAttribute('data-motion', 'waiting')
  const after = await page.evaluate(
    () => (window as unknown as { __motionSubs: { orientation: number; motion: number } }).__motionSubs,
  )
  expect(after.orientation).toBe(1)
  expect(after.motion).toBe(1)
})

test('denied permission is not described as motion on', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
      configurable: true,
      value: () => Promise.resolve('denied'),
    })
  })
  await openApp(page)
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
  await page.getByRole('button', { name: /Motion Buddy/ }).click()
  await expect(page.getByText('Expressive v2')).toBeVisible()
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

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('keeps a large unclipped face and large controls', async ({ page }) => {
    await openApp(page, 'e2e=1&hintMs=0')
    await expectFaceInside(page, 180)
    await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
    await page.getByRole('button', { name: /Motion Buddy/ }).click()
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
