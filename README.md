# Motion Buddy

Motion Buddy is a browser face for the screen you already have open. The page is black, with large plain white eye shapes and a tiny mouth. There are no pupils, outlines, or a body. Controls stay hidden until you ask for them. Accents tint those shapes; white is the default.

This is a browser prototype only. It is not an iPhone app and not an Apple Watch app. A square window is a layout check for a possible later watch face, not a watch build. It does not wake a locked or sleeping phone, and it does not keep running if the browser suspends the tab.

## Run locally

```bash
npm install
npm run dev
```

Vite can serve a local dev build on port 43123. That address is not a phone website.

Cursor’s Apps docs describe a preview tray and a separate Publish step where a person picks the public URL and Cursor runs security checks. Public sharing is off by default for team plans, and the docs do not state a hosting price. This unpublished Origin draft was not sent through that publish step, so there is no live HTTPS app URL.

A downloadable static build is produced with:

```bash
npm run package:static
```

That writes `dist/` (`index.html`, assets, `motion-buddy.html`, and `DEPLOY.txt`) and `motion-buddy-phase1.zip`. Upload the unzipped folder to a static host. `motion-buddy.html` inlines the script and styles and does not load fonts or other remote files. Opening the file directly is not a secure-page sensor test.

## Using it

The face fills the page, with a margin so the eyes and mouth stay on screen in portrait, landscape, and square windows. A short hint tells you to tap, or to click or press Enter. The hint fades. The same instruction stays on the control for a keyboard or screen reader. Escape, Close, or a tap on the dim area puts the controls away. Using a control does not close the panel or switch expression by accident.

- **Awake** stays expressive while this page is open and visible.
- **Rest until motion** rests until a clear tilt arrives, then stays up for about 12 seconds of calm. **Preview wake** runs that path with no sensor. Small jitters are ignored, and the wake level has to hold briefly before it counts.
- **Auto** eases through the expressions you leave checked. Each one holds about 12 seconds, then eases for about 1.6 seconds. Auto pauses while the face is resting. At least one expression stays selected. An unchecked expression is also blocked when the face wakes from motion.
- **Curious, Happy, Grumpy, and Sleepy** hold that expression.
- Four accents tint the eye and mouth shapes. The background stays black. White is the default.
- **Enable motion** asks for device orientation only after you tap. The status says motion is on only after numeric orientation events arrive. Denied permission and a grant with no events stay worded that way.
- **Keep screen on** uses the Screen Wake Lock when the browser has it. The browser drops it if you leave the page. If the API is missing, the control says so.

Calmer system motion shortens expression changes and spaces blinks further apart. The face still changes expression.

Limits live in Setup and limits, not on the face.

## Test

```bash
npm test
```

That runs the unit tests, a production build, and browser tests against that build. `npm run test:unit` and `npm run test:browser` run the parts separately.

Auto timing and rest timing in the browser tests use `/?e2e=1` and `window.__motionBuddyTest`. That hook is absent on a normal production page.

## What was tested

Desktop Chromium via Playwright. Not a physical iPhone, and not a watch.

Unit tests, 25 passed:

- Auto walks only the selected expressions, and a single choice does not cycle.
- The last Auto expression cannot be removed.
- An expression left out of the set cannot be chosen by hand, and a motion wake will not show it.
- Manual grumpy eases the mouth and eyes. There is no bobbing value.
- A small movement does not wake rest. A sustained level does, after smoothing and a short debounce.
- Preview wake lifts a resting face, then a calm hold lets it rest again.
- Preview wake does nothing to the sensor level while Awake is selected.
- Hidden time does not advance Auto or motion.
- Blinks open again. Reduced motion does not blink during the normal gap.

Browser tests, 26 passed, against `npm run build`:

- The production page does not expose the test hook.
- The companion view is black, the eyes are plain white filled shapes with no iris, pupil, or outline, and the expression controls stay hidden.
- A labelled simulation starts worried without marking the sensor on, then returns to idle.
- A quicker movement reading starts dizzy. Turning dizzy off blocks it, and it is not turned back on by itself.
- A movement event counts only when the acceleration numbers arrive. Orientation and movement listeners are both added only after Enable motion.
- Face mode shows no expression buttons or Enable motion until the face control is used. The hint is visible at first and then gone.
- Opening controls, choosing Happy, and dismissing the dim area leaves Happy on the face.
- Tab, Enter, and Escape open and close controls, and focus returns to the face.
- A coarse pointer gets “Tap for controls.”
- Auto can be limited to one expression, and the last checkbox stays on.
- Rest stays resting, Preview wake brings the chosen expression up, and the calm hold returns to rest. A small fed level does not wake; a sustained level does.
- Reduced motion still changes to Sleepy.
- No orientation listener until Enable motion, and no acceleration listener.
- Denied permission never says motion is on.
- A granted permission with no event ends as not turned on.
- Motion turns on only after an event with numeric angles. An empty event does not count.
- Hiding the page pauses the engine and tilt listening.
- Screen wake lock reports denied, granted, and unsupported. Granted copy says it is only for this visible page. Setup text says it is not a system always-on switch.
- Portrait 390×844, landscape 844×390, square 320×320, and desktop 1280×800 keep the face inside the screen with at least an 8px margin. Portrait controls are at least 48px tall. The square Close control is on screen and at least 44px tall.

## Limits

- iPhone Safari tilt, permission sheets, and background suspension were not tested on hardware. Desktop emulation cannot stand in for that.
- Nothing here wakes a locked phone, a sleeping screen, or a suspended tab. Rest until motion is only while this page is open and visible.
- Screen Wake Lock is optional and browser-dependent. It is not a promise that the system stays on.
- There is no Apple Watch binary. The square layout is a design check only.
- Maps, Waze, music, microphone, sound, chat, accounts, location, tracking, and payments are out of scope.
- Warmth and battery use are untested.
