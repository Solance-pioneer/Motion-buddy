# motion-buddy-comigo-gentle-bleeps-v1 — provenance

Internal app-embedding copies of 4 selected gentle cues from the Michael-approved CoMiGo pack. This is not a bulk import. File-only preparation and QA; no listening, runtime, phone or deployment claims.

## Source pack

- Zip path: `/workspace/motion-buddy-comigo-approved/Comigo's Bleeps n Bloops.zip`
- Zip SHA256: `988074a2db1f71f5387dabe5926599d7e09ee43fb165949afe8e2fe37193f263`
- Zip listing: 67 WAV files only; no licence, readme or other text members inside the archive.
- Approved folder also contains `TERMS-NOTES.txt` and `manifest.json` (not inside the zip). Folder manifest records the same zip SHA256, `zip_crc_check: passed`, and `embedded_texts: []`.
- Source page: https://comigo.itch.io/bleeps-n-bloops
- Creator: Cosmo Myzrail Gorynych
- Pack approved by Michael, Dicker Ltd, 2026-11-06 21:51 GMT (folder manifest). This selection and conversion approved by Michael on 11 Nov 2026.

## Licence / terms

Licence terms were not present inside the zip. They were found in `/workspace/motion-buddy-comigo-approved/TERMS-NOTES.txt` (copied below in full):

```
Source: https://comigo.itch.io/bleeps-n-bloops
Creator: Cosmo Myzrail Gorynych
Creator states: I distribute the sounds under the CC0 license. Crediting is not required, though welcome.
CC0 permits commercial use, editing, embedding and redistribution. Source page verified through WebFetch and ordinary browser; free download required no payment/account.
Original ZIP preserved unchanged. No audition, conversion, app integration, public posting or additional asset downloads.
Source screenshot: /cursor/stores/user/grok-bot/agents/97be4120-b0bf-468f-bf55-7e34b2af450e/assets/4cdc389bf6804ebceb5a759da07df52f44282367c164dbf79bc20cb012098b54.png
```

The unused zip members were not copied into this folder. The approved zip was left unchanged.

## Picked originals (copied to `originals/`)

| Role | Original filename | Original SHA256 | Why picked (filename + numeric checks only) |
| --- | --- | --- | --- |
| tap | Press_03.wav | 019fad58049fb4a2c946ee16d47dd6d4c8a547f105f6a9ba2b2284b837d982b9 | Short press/bloop, trimmed ~0.12 s, mid-low tone, low HF energy, no clipping |
| blink | Press_02.wav | 03e5adad7865eb3ceac69737db5989192e517c8c3793022ddb1b8c06f39cb86d | Very short mid-tone blip, ~0.016 s, no HF harshness, no clipping |
| idle | Press_01.wav | b3cb78b182ea645982500ecce0f6debf4d3448c1b72dbebdfb7eee23ed24865d | Longer decaying press/bloop, trimmed ~0.31 s, low HF energy, no clipping |
| ack | Jump_01.wav | 751da8f599e9c6887befdcc4da94c3652284a08804faab1b33c3c9e35b2c6deb | Soft happy/ack, tonal rising jump, trimmed ~0.48 s (<0.6 s), low HF energy, no clipping |

Rejected from a short numeric shortlist (not copied): Alarm/Radar/Shoot/Zap/EMP/Bomb/Break/Impact and similar names; PowerUp_01/02 (too long and brighter HF); Bounce.wav and Press_04.wav (higher HF / centroid); Press_05.wav (less tonal); Step / Step_Soft (footsteps, not bleeps); Random_05.wav (very low-frequency, not a chirp); Random_06.wav (ambiguous spectrum, brief very-high-frequency bin).

## Processing

See `source/convert.py`. Each cue: ffmpeg decode/resample to mono 48 kHz; trim leading/trailing silence at −60 dBFS relative to peak (trim before DC removal); DC removal; linear 12 ms fade-in / 45 ms fade-out, scaled in the same 12:45 ratio when the trimmed clip is shorter than 57 ms (applies to blink); peak −16 dBFS (−18 dBFS for idle); PCM16 WAV; exact zero first and last samples. No time-stretch or creative layers.

## Playback

Finite one-shot per cue. Suggested uses and cooldowns are in `manifest.json`. Respect mute. Clean up when the app is hidden or the mode turns off.
