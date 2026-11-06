# Motion Buddy playful originals v1

Created asset handoff, not integrated or published. Contains one mathematically seamless sustained contact loop, three gentle petting variants, four scenario cues, four original costume overlay SVGs and a static direction board. See interaction-and-scenario-direction.md and integration-manifest.json.

Generate with Python 3, numpy, Pillow and cairosvg: `python3 src/create_playful_assets.py`. On this computer the renderer is available in `/workspace/.venvs/studio-assets/bin/python`. Source masters are float32 48 kHz mono; app copies are PCM16 48 kHz mono. The continuous loop deliberately has no baked fade or silent tail: gain ramps belong in the app. Other one-shots have quiet edges.

All sound and vector content was created procedurally for Michael Dicker without downloaded audio/art or reference music. No public release/licence grant is implied by handoff. Original creation is not a legal opinion or blanket trademark clearance. Static concepts have been visually inspected, but runtime animation, live sound mixing, human listening and phone testing have not been performed.

Scene policy revised23:23 GMT: ninja6s, hero7s, racer7s, ghost7.5s; uninterruptible by normal face gestures, mute/exit safety retained. See scene-policy-and-timings.json. Earlier shorter/interruptible instructions are superseded.
