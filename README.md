# Bram

Bram is a small stationary dashboard companion: one clay pocket lantern that idles, leans a little, and shifts between curious and slightly grumpy. Set it up while parked. It does not listen to the microphone, use location, sign you in, or send anything to a server.

This is a browser prototype. It is not an Apple Watch app, and it does not keep animating in the background.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43123

On a phone, use the same Wi-Fi and the Network address Vite prints, over HTTPS if you want tilt. iPhone Safari only shares device tilt after you tap **Enable motion**, and only on a secure page (HTTPS, or localhost on the phone itself).

## Controls

- **Auto** keeps one mood for a while, then eases into the other. Curious rests about 14 seconds, the shift takes about 1.8 seconds, grumpy rests about 11 seconds, then it eases back.
- **Curious** and **Grumpy** hold that mood. Bram eases between them instead of popping.
- **Preview sway** is a slow desktop stand-in for tilt.
- Moving the pointer also leans Bram a little, with a dead zone in the middle.
- **Enable motion** asks for device orientation. Motion is marked on only after a real tilt event arrives. If you deny it, or no event arrives, the label says so and the pointer / preview sway stay available.
- **Set level** appears once tilt is actually on. It treats the current angle as upright.

Tilt uses orientation only. It is smoothed, ignores about 4 degrees of jitter, and caps at a small lean. Hard braking is not a reaction the prototype looks for.

If the system setting “reduce motion” is on, Bram holds a quieter pose: no bounce, no sway, and no tilt lean. Mood buttons still work.

## Test

```bash
npm test
```

That runs the unit tests, then a production build, then browser tests against that build.

`npm run test:unit` and `npm run test:browser` run the pieces separately.

Auto timing in the browser tests uses a test clock at `/?e2e=1` (`window.__bramTest.seek`). That hook is not added on the normal production page.

## What was tested here

Desktop Chromium (Playwright), not a physical iPhone:

- Unit tests, 16 passed: mood dwells and transitions, tilt deadband and cap, smoothing, permission results, blink, reduced motion, preview sway, manual mood, hidden-tab pause, and a source scan that the app does not reference microphone, location, audio, storage, or network APIs.
- Browser tests, 12 passed, against `npm run build`:
  - Curious and Grumpy buttons settle the same character, including mouth shape.
  - Auto follows the test clock through a curious dwell, the midpoint of a shift, and a grumpy dwell.
  - Pointer lean stays capped, and Preview sway can be turned off.
  - Reduced motion keeps bounce at 0, ignores pointer lean, and disables sway and Enable motion.
  - Portrait 390×844: character above the controls, mood buttons at least 48px tall, parked note visible, no horizontal scroll.
  - Landscape 844×390: controls beside the character, buttons at least 44px tall, parked note on screen.
  - Desktop 1280×800: Bram centered, with the mood note visible.
  - No orientation listener until Enable motion, and no motion-acceleration listener at all.
  - Denied permission stays denied and never says motion is on.
  - A granted permission with no orientation event ends as “not turned on”.
  - Motion turns on only after an event with numeric angles, then a later tilt leans Bram within the cap.

## Limits

- Desktop emulation cannot verify iPhone Safari tilt. A real phone may show a system permission dialog, deny it, or never send events; the prototype is written for those cases but they were not exercised on hardware.
- Screen-on warmth and battery use have not been measured and are not certified safe.
- There is no Apple Watch version and no claim that the animation continues while the phone is locked or in another app. The animation pauses when the page is hidden.
- Do not use the controls while driving. This is a stationary prototype — set it up while parked.
