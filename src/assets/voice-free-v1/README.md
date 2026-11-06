# Motion Buddy — voice-free replacements

Two original mathematical electronic cues, not vocal recordings.

- `celebration_three_squeaks`: three rounded upward squeaks for the retained three-bounce celebration face. Nominal energy peaks 0.16, 0.48, 0.80 seconds. Duration 1.05 s.
- `proud_rise_beeps`: four short rising beeps ending in a soft squeak for the retained proud/level-up face. Energy peaks 0.105, 0.28, 0.46, 0.71 seconds. Duration 0.92 s.

Existing animation timings have not been verified here. Integration should align the face's existing beats, rather than alter the face to fit assumed timings. The source accepts `--bounce-centers a,b,c` to regenerate the triplet if needed; update the manifest/package after regeneration.

Run `python3 src/synthesize_voice_free.py` with Python 3 and numpy. This only writes files inside this asset folder, never an application/repository. Use app/ PCM16 files for integration. Retain masters/, source and manifest as provenance.

All audio is original procedural synthesis for Michael Dicker. No sampled inputs, external audio, voices or sound-alike imitation; no external content licence or attribution obligation introduced. No public release/licence grant is implied by this handoff.

Remove Japanese/Conte de Fees audio and playback/menu/preload routes from the runtime bundle, preserving the associated animations and existing original sound assets. Do not delete historic master/provenance records. Keep remembered mute, initial-gesture gating, no overlap and interruption behavior.

Numerical QA is not listening or phone validation. These cues are generated and measured, not integrated or published.
