# Finger play: expanded movement and gentle edge squish

This is a design handoff, not implemented code or a claim about the live preview.

Keep Buddy's level white rounded eyes, tiny mouth and black screen; preserve the existing playful dodge/orbit behavior. This change makes the movement legible and lets it use the screen, rather than creating a new character or rigid cursor tracking.

## Travel
- Replace an arbitrary centre-limited movement box with a clamp derived from the face group's actual rendered bounding box, the current viewport and safe-area insets. Include mouth, all eye extremes and any squash/stretch.
- With an approximately 8 CSS-pixel visual breathing margin beyond the applicable safe inset, the face should be able to reach near the top, bottom, left and right. This margin is a starting design value, not measured from the current app. Do not move controls or overlap their active targets.
- Recalculate for orientation/viewport resize. Keep the full face visible and reachable, with no clipped eye or mouth.
- Preserve smooth trailing rather than a one-frame jump; target clear movement from a modest drag. Avoid tremble at a clamp.

## Squash
- At the left/right boundary, anchor to the contacted edge and ease horizontal scale toward 0.76; at most a subtle vertical stretch toward 1.05 if bounds allow.
- At top/bottom, ease vertical scale toward 0.80; at most subtle width 1.04 if bounds allow. At corners compress both axes; do not add expansion that clips another edge.
- Amount should grow with attempted overshoot, not flip on/off. These are maximum proposed design values for Code to bound, not existing implementation values.
- Compress the eye/mouth group coherently, keeping eyes level and rounded. No slanted/almond eyes, sharp corners, pupil additions or huge mouth.
- On release/cancel, un-squish in about 200-300 ms and smoothly return to neutral in about 400-600 ms, without repeated bouncing. Preserve the app's reduced-motion handling; no extra oscillation in reduced motion.

## Sound
Use app/curious_pet_glide_app_pcm16_48k.wav as the drag/petting cue instead of the sharp repeated drag sound. One soft 1.8-second rising/falling electronic phrase. Start only when actual drag is recognized, not each pointer move. Initially at most once per contact, no automatic loop. Release/cancel/mute/hidden tab/control touch interrupts with a 100-150 ms fade. No overlap or trailing delayed beeps. Keep the existing short-tap chirp and other face cues unchanged.

## Focused acceptance checks for the existing workstream
1. Portrait and landscape: drag toward each edge and corner; all face features stay visible and reach near safe bounds rather than a central cage.
2. At an edge, squash is obvious but gentle, anchored at contact; no sudden position jump, hard jitter or out-of-bounds stretch.
3. Release and pointercancel restore neutral; viewport resize while displaced leaves face in bounds.
4. A long sequence of move events produces one sustained cue per contact, never sharp repeated alarms. Release or mute fades it promptly.
5. Tap remains the existing chirp; double tap/menu/mute targets do not trigger petting sound or count as extra face taps.
6. Initial-gesture audio gating, remembered mute, reduced motion and non-overlap still pass.

Perform the normal focused existing-build checks and at most one corrective pass for this scoped update. Physical phone sound/gesture verification is still separate from automated tests.
