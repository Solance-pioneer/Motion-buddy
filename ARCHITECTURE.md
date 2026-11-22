# Motion Buddy architecture notes

This page is the seam list for a future native app. The web build does not take payment and does not ship a store SDK.

## Clip table

`src/logic/clip-table.ts` is the only list of batch-1 films. A new clip is one row: id, number, file, trigger, cooldown, and tier. Rush and brake stay on their own player and are not rows in that table. Batch films load one at a time through `import.meta.glob` with a URL query. They do not start while rush or brake is up. A pointer or touch on Buddy cancels every film, including rush and brake, and idle or random films then wait `TOUCH_SUPPRESS_MS` (4 seconds). The gallery's play control is the exception, because that tap is what starts the film.

## WeatherProvider

`src/logic/weather/types.ts` defines `WeatherProvider`. It returns normalised flags only: rain, snow, clearing, hot, windy, and isDay, plus optional raw numbers for debugging. Clip rules and the gallery weather switch read those flags and never a provider payload. `OpenMeteoProvider` is the only implementation. A future iOS app can add WeatherKit, and a commercial Android app can add its own provider, without changing the clip table. The Open-Meteo free tier is non-commercial; a commercial release needs a paid plan or a different provider. The web client asks for location only after Weather moods is on, rounds it to about 0.1°, and caches the flags for an hour. It does not keep the location in persistent storage.

## Audio session

Clips should use `AVAudioSession` category `.ambient`, or `.playback` with `.mixWithOthers`, so they mix with other apps. Beat listening uses `.playAndRecord` and can pause other audio. The web build sets `navigator.audioSession.type` to `ambient` while a clip plays and the mic is off, and to `play-and-record` while Beat listening is on. Clip `<video>` elements stay muted and inline. Their soundtrack is played on the shared Web Audio context so the element does not take the playback session. Where `audioSession` is missing, the video stays muted: an unmuted video can pause other music, and the page cannot force a mixable category. That is a browser limitation.

## Entitlements

Every clip row and the two feature rows (`weather-moods`, `clip-gallery`) have `tier: 'free' | 'premium'`. Weather moods and the five weather films are marked premium because they are the location-backed extra. Everything else is free. `isUnlocked(featureId)` in `src/logic/entitlements.ts` is the only gate. It is a stub that returns true, with a note that it will later connect to App Store and Play purchases. There is no paywall.
