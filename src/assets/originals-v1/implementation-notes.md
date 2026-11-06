# Motion Buddy originals v1 — implementation notes

## Runtime source of truth
- Prefer `animation/poses/*.json` (`authoring_keyframes` + `samples_24fps`) for expression playback.
- Animated SVGs are portable previews; do not treat SMIL as the only runtime format.
- Keep original rounded LEVEL white pill/arc eyes and tiny simple mouth on black. Do not port rejected almond/slant shapes, pupils, bodies, or human lips.

## Audio
- Use `audio/app/*_app_pcm16_48k.wav` as the app copies (`sneeze_zip`, `peek_pop`, `pout_boop`).
- Pairing: `original_sneeze`↔`sneeze_zip` @ 1.1s into the 4s clip; `original_peekaboo`↔`peek_pop` @ 1.2s; `original_pout_melt`↔`pout_boop` @ 0.8s.
- Do not overwrite approved primarychirp or earlier approved SFX. These three are additive originals.
- Loudness: short-beep matching used sample peak / active RMS (see audio-manifest). No phone audition claimed.

## Reduced motion
- When reduced motion is on, hold a readable mid-expression still (sneeze: closed-arc+O; peekaboo: both-open smile; pout_melt: happy-arc+smile) or neutral — do not play the full path.

## Owned elsewhere (Solance)
- App volume bounds, mute UX, shared cooldown, gesture wiring (tap / double-tap menu / drag-dodge / faint mute), and deploy/integration into the live preview.

## Pack status
- Portable assets only. Not yet integrated or deployed. Review MP4 is for coordinator/owner review, not a release binary.
