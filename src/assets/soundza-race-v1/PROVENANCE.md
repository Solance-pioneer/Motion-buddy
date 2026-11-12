# Soundza Big Block V8 — Race activation

The app plays one PCM16 mono 48 kHz copy when Race mode turns on. The original master stays off this repo. This note is not the recording.

- Source: https://soundza.com/sound/big-block-v8-engine-rev
- Licence: https://soundza.com/license (Soundza Standard License)
- Commercial use inside an app is allowed. Attribution is not required.
- The sound must not be redistributed as a standalone file, uploaded as a sample pack, claimed as ours, or used to train AI.
- Owner approval: Mike, 7 Nov 2026, 11:47 CET, for Race activation.
- Master SHA-256 (not in this repo): `3b3654a7f77dd436d09bde5fae4b4d2515a64e25ada9c3006fe656d51f882744`
- App copy SHA-256: `6384c4696663b712dfde09357b2b0f247a90488862f1fb1c6779dd015916b02d`
- App copy: PCM16, mono, 48 kHz, 2.0s, fades already applied. It lives in the audio pipeline (`src/logic/soundza-wavs.ts`), not as a downloadable WAV.

The app copy must not be redistributed on its own.

The older synthetic activation rev is still in the repo and is not played. Race-on uses the Soundza cue in every case, including reduced motion and when the rush film does not start. The files left unused are `src/assets/drive-audio-v1/audio/app/race_activate_rev_app_pcm16_48k.wav` and `src/assets/drive-audio-v1/audio/masters/race_activate_rev_master_f32_48k.wav`.
