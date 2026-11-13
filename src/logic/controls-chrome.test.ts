import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { chromeAfterInput, faceTapOutcome } from './controls-chrome.ts'
import { initialTouch, touchDown, touchUp } from './touch.ts'

describe('idle controls', () => {
  it('wakes faded controls on one tap and still fires the tap', () => {
    const up = touchUp(touchDown(initialTouch(), 4, 4, 0).clock, 30)
    const outcome = faceTapOutcome(up)
    expect(outcome.reaction).toBe(true)
    expect(outcome.reveal).toBe(true)
    expect(outcome.menu).toBe(false)
    expect(chromeAfterInput(false, 'touch')).toBe(true)
    expect(chromeAfterInput(false, 'motion')).toBe(false)
    expect(chromeAfterInput(true, 'motion')).toBe(true)
    expect(chromeAfterInput(true, 'idle')).toBe(false)
  })

  it('opens the menu on the second tap inside the double-tap window', () => {
    const first = touchUp(touchDown(initialTouch(), 4, 4, 0).clock, 20)
    expect(first.singleTap).toBe(true)
    const second = touchUp(touchDown(first.clock, 5, 5, 120).clock, 160)
    const outcome = faceTapOutcome(second)
    expect(outcome.menu).toBe(true)
    expect(outcome.reaction).toBe(false)
  })

  it('puts Clips in the menu and does not keep a standalone Clips button', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    const menu = readFileSync('src/view/AdminMenu.tsx', 'utf8')
    const user = readFileSync('src/view/Controls.tsx', 'utf8')
    const css = readFileSync('src/styles.css', 'utf8')
    expect(app.includes('clip-gallery-open')).toBe(false)
    expect(menu.includes('>Clips<')).toBe(true)
    expect(menu.includes('onOpenClips')).toBe(true)
    expect(user.includes('>Clips<')).toBe(false)
    expect(user.includes('>Admin<')).toBe(true)
    expect(app.includes('setGalleryOpen(true)')).toBe(true)
    expect(app.includes('if (step.singleTap) confirmSingle()')).toBe(true)
    expect(app.includes("data-chrome={chromeOn ? 'on' : 'off'}")).toBe(true)
    expect(css.includes(".app[data-chrome='off'] .screen-chips")).toBe(true)
    expect(css.includes(".app[data-reduced='true'] .screen-chips")).toBe(true)
    expect(css.includes('min-height: 44px')).toBe(true)
    expect(app.includes('>Party mode<')).toBe(true)
    expect(app.includes('aria-label="Genre"')).toBe(true)
    expect(user.includes('>Chill<')).toBe(true)
    expect(user.includes('>Hype<')).toBe(true)
    expect(user.includes('>Steady<')).toBe(false)
    expect(user.includes('>Party mode<')).toBe(false)
  })
})