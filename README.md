# Motion Buddy

Motion Buddy is a browser face for the screen you already have open. The page is black, with original white eye shapes and a readable smile. There are no pupils, outlines, or a body. Controls stay hidden until you ask for them. Accents tint those shapes; white is the default. The customer app is Expressive v3.3. The owner audition is a separate local file and is not part of the customer site. A tilt or shove to the left looks left, and the opposite looks right. Shock holds that direction, then settles. Desk idle now includes the documented shy glance, happy caret, double-take, yawn, and a short wink. Laugh stays opt-in. This build was Expressive v2.2 in this respect: Expressions morph on one face, a modest tilt moves that face clearly, and motion starts without a settings hunt. Eyes stay level. Blush is only the rare wink. The wide parted Laugh mouth stays out of Auto until Use Laugh is turned on. Desk, Car, and Wrist still change the idle faces. Car speed lines are a simulated decoration, not engine speed or location. Wrist is a browser profile, not a watch or a health sensor.

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

That writes `dist/` (`index.html`, assets, `motion-buddy.html`, and `DEPLOY.txt`) and `motion-buddy-expressive-v2.2.zip`. Upload the unzipped folder to the existing static host. `motion-buddy.html` inlines the script and styles and does not load fonts or other remote files. Opening the file directly is not a secure-page sensor test. The previously published page stays the old build until that new folder is uploaded.

## Using it

The face fills the page, with a margin so the eyes and mouth stay on screen in portrait, landscape, and square windows. A short hint tells you to tap, or to click or press Enter. The hint fades. The same instruction stays on the control for a keyboard or screen reader. Escape, Close, or a tap on the dim area puts the controls away. Using a control does not close the panel or switch expression by accident.

- **Awake** stays expressive while this page is open and visible.
- **Rest until motion** rests until a clear tilt arrives, then stays up for about 12 seconds of calm. **Preview wake** runs that path with no sensor. Small jitters are ignored, and the wake level has to hold briefly before it counts.
- **Desk, Car, and Wrist** sit at the top of the controls. One is active. Desk daydreams and sometimes yawns. Car holds a focused face and may show brief simulated speed lines. Wrist pants, then recovers with a happier face. Switching mode does not turn an excluded face back on.
- **Auto** walks the idle sequence for the active mode, using only faces you leave checked. At least one face stays selected. An unchecked face stays out of Auto, manual hold, and motion reactions, including recovery.
- Any listed face can be held on its own. Curious opens with a clear smile.
- Four accents tint the eye and mouth shapes. The background stays black. White is the default.
- **Allow motion** sits on the face when the browser needs a tap before it can ask, which is how iPhone Safari works. That tap is the permission gesture. **Not now** leaves the face running and does not ask again until Enable motion in the controls. Browsers that can listen without a prompt start on their own. **Turn motion off** stops listening. Motion is marked on only after numeric events arrive. Denied permission, a grant with no events, and an unavailable page stay worded that way. Simulation is still not the sensor.
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

Unit tests, 39 passed:

- Auto walks only the selected expressions, and a single choice does not cycle.
- The last Auto expression cannot be removed.
- An expression left out of the set cannot be chosen by hand, and a motion wake will not show it.
- Manual grumpy eases the mouth and eyes. There is no bobbing value.
- A small movement does not wake rest. A sustained level does, after smoothing and a short debounce.
- Preview wake lifts a resting face, then a calm hold lets it rest again.
- Preview wake does nothing to the sensor level while Awake is selected.
- Hidden time does not advance Auto or motion.
- Blinks open again. Reduced motion does not blink during the normal gap.
- A stationary Desk ten seconds includes at least three gaze positions, a blink, and two poses. Car opens on a determined face with simulated speed marks. Wrist opens on a pant. An excluded pose is not put back by a mode or a reaction.
- Expression changes pass through the in-between face. Reduced motion snaps. A full look moves the drawn face more than 12 units in the 100-unit canvas. A 10° tilt maps into that same obvious range. A 1° tilt does not.
- Every pose has level eyes. Only the rare wink blushes. Laugh is out of the default Auto set, appears only after opt-in, and then only for a short beat. Wink is a short slice of the desk loop.

Browser tests, 35 passed, against `npm run build`:

- The production page does not expose the test hook.
- After Close, the hint is gone and only the face remains, even though focus returns to it.
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
- Orientation and movement listeners are added only after Enable motion.
- Desk, Car, and Wrist change the face. Expressive v2 is labelled inside the controls. Close leaves no hint and no panel.
- Ten stationary seconds show several gazes, a blink, two poses, and a smile wider than a dot. Reduced motion keeps gaze and blinks still.
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
