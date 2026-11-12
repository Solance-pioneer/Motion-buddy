# Motion Buddy Japan v1 layout-r1 — additive original asset handoff
NOT integrated, runtime tested or deployed. This separate pack does not replace the four-country pack.

Owner t19u requested a samurai helmet and Mount Fuji. Original simplified kabuto (no blades/body/face) and general-knowledge snowcapped Fuji paths. Layout-r1 lowers the broad stationary Fuji entirely below y244, clear of the complete bow face sweep; audio and helmet remain byte-identical to v1. No copied characters, traces, external art/audio/photos, downloads or samples. Existing rounded level eyes and tiny mouth stay the app's own, registration 360x360; board demo face is illustrative only.

8s full scene: plain0–.3, crossfade by1.1, gentle respectful bow2–3.1, quiet hold, fade6.6–7.4, exact plain by8.0. Helmet follows face, behind existing app features; static Fuji world backdrop below ALL face art. Reduced motion = static art/crossfade, no bow. Full8s input lock, discarded input, held-pointer release gate, no start during contact; immediate mute and hidden/pagehide/exit cleanup always available. Browser/OS navigation never trapped. See scene-spec.json.

Full8s newly composed through-phrase soft pluck/pad score (not an anthem, historical reconstruction, authentic Japanese music claim, reused sting or loop). No voice, sampled Japanese instruments or modern melody. 48k mono float32 master and PCM16 app copy, normalized to -13dBFS (ceiling -12.5), zero endpoints. Start once at0, never stretch/retrigger/loop. Existing audio files are untouched.

Source: `src/create_japan.py`. Reproduce into a NEW output root with `/workspace/.venvs/studio-assets/bin/python src/create_japan.py /path/to/new-output`. numpy/Pillow/cairosvg and ffmpeg required. The generator preserves itself in fresh output; all source geometry/score data editable there. Manifest hashes all files except itself.

QA: strict JSON/XML, raster bounds, exact audio duration, finite/peak/DC/endpoints, clean ffmpeg decode, descriptive10/50ms RMS rise measurements. No human listening, phone test, app/runtime test or deployment. Board is one static still, not animation verification. Music needs listening and final app integration review; runtime safety is a specification, not a tested app claim. Worldwide legal clearance not claimed.
