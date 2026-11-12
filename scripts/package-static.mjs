import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const dist = 'dist'
const htmlPath = join(dist, 'index.html')
const html = readFileSync(htmlPath, 'utf8')
const scriptSrc = html.match(/<script[^>]+src="([^"]+)"/)?.[1]
const styleHref = html.match(/<link[^>]+href="([^"]+\.css)"/)?.[1]
if (!scriptSrc) throw new Error('Built index.html has no script src')

const script = readFileSync(join(dist, scriptSrc.replace(/^\//, '')), 'utf8')
const style = styleHref ? readFileSync(join(dist, styleHref.replace(/^\//, '')), 'utf8') : ''
const single = html
  .replace(/<link[^>]+href="[^"]+\.css"[^>]*>/, style ? `<style>${style}</style>` : '')
  .replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/, `<script type="module">${script}</script>`)

writeFileSync(join(dist, 'motion-buddy.html'), single)
writeFileSync(
  join(dist, 'DEPLOY.txt'),
  [
    'Motion Buddy customer app, Expressive v3.5.',
    'This zip is the public companion. It does not include the owner audition.',
    'Upload this whole folder to a static host and open index.html.',
    'motion-buddy.html is the same app with the script and styles inlined. It does not load fonts or other remote files.',
    'Opening the file directly is not a secure-page sensor test. Phone tilt and movement need HTTPS.',
    'Sound is on until it is turned off in the menu. The browser still stays quiet until the first tap. Beeps and squeaks only. No spoken voice lines.',
    'On an iPhone, the first tap must be Allow motion on the face. iOS shows the permission prompt only after that tap. Not now leaves the face running. Other browsers start listening when the secure page opens.',
    'This build does not wake a locked phone and is not an Apple Watch app.',
    '',
  ].join('\n'),
)

const soundDir = join(dist, 'approved-sfx')
mkdirSync(soundDir, { recursive: true })
for (const name of [
  '01_38_scan_ORIGINAL_DRAFT.wav',
  '02_04_giggle_ORIGINAL_DRAFT.wav',
  '03_40_surprise_ORIGINAL_DRAFT.wav',
  '04_42_yawn_ORIGINAL_DRAFT.wav',
  '05_48_wink_ORIGINAL_DRAFT.wav',
  '06_15_dizzy_ORIGINAL_DRAFT.wav',
]) {
  copyFileSync(join('src/assets/approved-sfx', name), join(soundDir, name))
}
const originalDir = join(dist, 'originals-v1')
mkdirSync(originalDir, { recursive: true })
for (const name of ['sneeze_zip_app_pcm16_48k.wav', 'peek_pop_app_pcm16_48k.wav', 'pout_boop_app_pcm16_48k.wav']) {
  copyFileSync(join('src/assets/originals-v1/audio/app', name), join(originalDir, name))
}
const voiceFreeDir = join(dist, 'voice-free-v1')
mkdirSync(voiceFreeDir, { recursive: true })
for (const name of ['celebration_three_squeaks_app_pcm16_48k.wav', 'proud_rise_beeps_app_pcm16_48k.wav']) {
  copyFileSync(join('src/assets/voice-free-v1/app', name), join(voiceFreeDir, name))
}
const contactDir = join(dist, 'contact-audio-v1')
mkdirSync(contactDir, { recursive: true })
for (const name of [
  'curious_contact_loop_app_pcm16_48k.wav',
  'pet_soft_squeak_app_pcm16_48k.wav',
  'pet_round_chirp_app_pcm16_48k.wav',
  'pet_content_wobble_app_pcm16_48k.wav',
  'pet_squish_press_app_pcm16_48k.wav',
  'pet_spring_release_app_pcm16_48k.wav',
]) {
  copyFileSync(join('src/assets/contact-audio-v1/audio/app', name), join(contactDir, name))
}
copyFileSync(join('src/assets/contact-audio-v1/audio-only-manifest.json'), join(contactDir, 'audio-only-manifest.json'))
mkdirSync(join(dist, 'petting-v1'), { recursive: true })
copyFileSync(
  join('src/assets/petting-v1/app/curious_pet_glide_app_pcm16_48k.wav'),
  join(dist, 'petting-v1/curious_pet_glide_app_pcm16_48k.wav'),
)
writeFileSync(
  join(dist, 'THIRD-PARTY.txt'),
  [
    'Third-party notices for this customer build.',
    '',
    'Web-Eye-Animation',
    'https://github.com/CyberAgentAILab/Web-Eye-Animation',
    'Commit 424773d1a6e1d28c1c168dbbb068ed4d0d220364',
    'Copyright (c) 2024 CyberAgent AI Lab',
    'MIT License. The surprise, joy-bounce, and sleepy eye timings were adapted into this app\'s own renderer.',
    'GSAP 3.11.4 is loaded by that project\'s demo from a CDN and is not part of the MIT grant. This package does not include GSAP.',
    '',
    'MIT License',
    '',
    'Permission is hereby granted, free of charge, to any person obtaining a copy',
    'of this software and associated documentation files (the "Software"), to deal',
    'in the Software without restriction, including without limitation the rights',
    'to use, copy, modify, merge, publish, distribute, sublicense, and/or sell',
    'copies of the Software, and to permit persons to whom the Software is',
    'furnished to do so, subject to the following conditions:',
    '',
    'The above copyright notice and this permission notice shall be included in all',
    'copies or substantial portions of the Software.',
    '',
    'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR',
    'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,',
    'FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE',
    'AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER',
    'LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,',
    'OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE',
    'SOFTWARE.',
    '',
    'Clap and level-up use original procedural beeps, celebration_three_squeaks and proud_rise_beeps. They are not spoken recordings.',
    '',
    'Kenney Interface Sounds',
    'Created by Kenney (www.kenney.nl). One cue, error_004.ogg, is embedded for the disapproving beep.',
    'License: Creative Commons Zero, CC0. http://creativecommons.org/publicdomain/zero/1.0/',
    'The rest of that pack is not included.',
    '',
  ].join('\n'),
)
mkdirSync('/opt/cursor/artifacts', { recursive: true })
const customerJs = readFileSync(join(dist, scriptSrc.replace(/^\//, '')), 'utf8')
for (const term of ['Export review', 'Face audition', 'Owner audition', 'motion-buddy-review', 'Try my companion']) {
  if (customerJs.includes(term)) throw new Error(`Customer bundle contains owner audition text: ${term}`)
}
let sourceCommit = 'unknown'
try {
  sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
} catch {
  sourceCommit = 'unknown'
}
writeFileSync(
  join(dist, 'BUILD.txt'),
  [
    'Motion Buddy customer build, Expressive v3.5.',
    `source_commit: ${sourceCommit}`,
    'Expressions original_sneeze, original_peekaboo, and original_pout_melt use the pose JSON samples.',
    'Sounds sneeze_zip, peek_pop, and pout_boop are the PCM16 48 kHz app copies. Masters are not rewritten.',
    'A drag plays curious_contact_loop once at gain 1. It does not loop or restart while the finger stays down. Masters are not rewritten.',
    'uk_soft_march_once and egypt_wonder_once play once, do not loop, and duck country music by 3 dB. Masters are not rewritten.',
    'The rope hero plays hero_original_fanfare once from the start for 7 seconds. It replaces the short flourish and does not loop. The float master is not rewritten.',
    'The racer plays racer_accelerate_return_brake once from the start for 7 seconds. It replaces the wind cue and does not loop. The float master is not rewritten.',
    'Car tilt leans Buddy from a neutral you set: top toward you leans ahead, away eases off, left and right bank. It is phone tilt, not vehicle speed or brakes. A missing or denied sensor stays neutral.',
    'A pet gesture plays one finite note: squish, spring, squeak, chirp, or wobble. It does not loop and a repeated note waits. Masters are not rewritten.',
    'Race plays the speed-rush clip once. That clip’s sound replaces race_activate_rev for that activation. Reduced motion skips the clip and plays race_activate_rev once. A brake lean plays the surprised clip once, then waits about 20 seconds. Reduced motion skips that clip too. Synthetic accelerate and brake cues still play when a clip does not start. They are not a recorded engine.',
    'Ambient costumes rotate through ninja, hero, racer, and ghost after 7 seconds of idle, and they wait out an active scene or gesture.',
    'Country cues uk_guard_march, france_cafe_waltz, usa_anthem_eagle, egypt_cinematic, japan_gentle_bow, and australia_hop_duet play once at gain 0.68. Masters are not rewritten.',
    'Four CoMiGo bleeps (tap, blink, idle, ack) are finite one-shots. They stay silent while muted and wait out their cooldowns. CC0, credit optional.',
    'Batch 1 films load one at a time. A touch cancels the film that is playing. Idle and random films then wait 4 seconds.',
    'Open index.html from this folder on a static host. The phone stays quiet until the first tap.',
    '',
  ].join('\n'),
)
const sceneDir = join(dist, 'scenes-v1')
mkdirSync(sceneDir, { recursive: true })
for (const name of [
  'ninja_soft_swish_app_pcm16_48k.wav',
  'hero_original_fanfare_app_pcm16_48k.wav',
  'racer_accelerate_return_brake_app_pcm16_48k.wav',
  'ghost_cute_boo_app_pcm16_48k.wav',
]) {
  copyFileSync(join('src/assets/scenes-v1/audio/app', name), join(sceneDir, name))
}
rmSync(join(sceneDir, 'hero_original_flourish_app_pcm16_48k.wav'), { force: true })
rmSync(join(sceneDir, 'racer_soft_wind_app_pcm16_48k.wav'), { force: true })
copyFileSync(join('src/assets/scenes-v1/scene-policy-and-timings.json'), join(sceneDir, 'scene-policy-and-timings.json'))
const countryDir = join(dist, 'scenes-v2')
mkdirSync(countryDir, { recursive: true })
for (const name of [
  'uk_guard_march_app_pcm16_48k.wav',
  'france_cafe_waltz_app_pcm16_48k.wav',
  'usa_anthem_eagle_app_pcm16_48k.wav',
  'egypt_cinematic_app_pcm16_48k.wav',
  'egypt_wonder_once_app_pcm16_48k.wav',
  'uk_soft_march_once_app_pcm16_48k.wav',
  'japan_gentle_bow_app_pcm16_48k.wav',
  'australia_hop_duet_app_pcm16_48k.wav',
]) {
  copyFileSync(join('src/assets/scenes-v2/audio/app', name), join(countryDir, name))
}
copyFileSync(join('src/assets/scenes-v2/provenance/NOTICE.md'), join(countryDir, 'NOTICE.md'))
const bleepDir = join(dist, 'comigo-bleeps')
mkdirSync(bleepDir, { recursive: true })
for (const name of [
  'tap_press03_pcm16_48k.wav',
  'blink_press02_pcm16_48k.wav',
  'idle_press01_pcm16_48k.wav',
  'ack_jump01_pcm16_48k.wav',
]) {
  copyFileSync(join('src/assets/comigo-bleeps-v1/audio/app', name), join(bleepDir, name))
}
writeFileSync(
  join(bleepDir, 'CREDIT.txt'),
  'CoMiGo Bleeps n Bloops by Cosmo Myzrail Gorynych. CC0. Credit optional. These four app copies are finite one-shots.\n',
)
const batchClipDir = join(dist, 'scene-clips-batch1-v1')
mkdirSync(batchClipDir, { recursive: true })
for (const name of readdirSync('src/assets/scene-clips-batch1-v1')) {
  copyFileSync(join('src/assets/scene-clips-batch1-v1', name), join(batchClipDir, name))
}
const clipDir = join(dist, 'scene-clips-v1')
mkdirSync(clipDir, { recursive: true })
for (const name of ['buddy-anime-speed-rush-v2.mp4', 'buddy-brake-surprised-v1.mp4', 'PROVENANCE.md']) {
  copyFileSync(join('src/assets/scene-clips-v1', name), join(clipDir, name))
}
const driveDir = join(dist, 'drive-audio-v1')
mkdirSync(driveDir, { recursive: true })
for (const name of [
  'race_activate_rev_app_pcm16_48k.wav',
  'car_accel_rev_a_app_pcm16_48k.wav',
  'car_accel_rev_b_app_pcm16_48k.wav',
  'car_brake_soft_a_app_pcm16_48k.wav',
  'car_brake_soft_b_app_pcm16_48k.wav',
]) {
  copyFileSync(join('src/assets/drive-audio-v1/audio/app', name), join(driveDir, name))
}
const zipPath = '/opt/cursor/artifacts/motion-buddy-customer-v3.5.zip'
rmSync(zipPath, { force: true })
execFileSync('zip', ['-r', zipPath, '.'], { cwd: dist })
console.log('Wrote dist/motion-buddy.html and /opt/cursor/artifacts/motion-buddy-customer-v3.5.zip')

execFileSync('npx', ['vite', 'build', '--config', 'vite.owner.config.ts'], { stdio: 'inherit' })
const ownerDist = 'dist-owner'
const ownerHtmlPath = join(ownerDist, 'owner.html')
const ownerHtml = readFileSync(ownerHtmlPath, 'utf8')
const ownerScriptSrc = ownerHtml.match(/<script[^>]+src="([^"]+)"/)?.[1]
const ownerStyleHref = ownerHtml.match(/<link[^>]+href="([^"]+\.css)"/)?.[1]
if (!ownerScriptSrc) throw new Error('Owner build has no script')
const ownerScript = readFileSync(join(ownerDist, ownerScriptSrc.replace(/^\//, '')), 'utf8')
const ownerStyle = ownerStyleHref ? readFileSync(join(ownerDist, ownerStyleHref.replace(/^\//, '')), 'utf8') : ''
const ownerSingle = ownerHtml
  .replace(/<link[^>]+href="[^"]+\.css"[^>]*>/, ownerStyle ? `<style>${ownerStyle}</style>` : '')
  .replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/, `<script type="module">${ownerScript}</script>`)
writeFileSync(join(ownerDist, 'owner-audition.html'), ownerSingle)
writeFileSync(
  join(ownerDist, 'OWNER.txt'),
  [
    'Motion Buddy OWNER AUDITION. Not the customer app. Do not publish this zip on a public preview.',
    'Open owner-audition.html on a computer. Choices are saved in that browser until you export the JSON.',
    'A local file cannot promise iPhone motion permission. Use the simulated movement controls. Real iPhone sensors need a secure page, decided separately.',
    'iPhone Quick Look does not run this HTML as an app.',
    '',
  ].join('\n'),
)
rmSync('/opt/cursor/artifacts/motion-buddy-owner-audition.zip', { force: true })
console.log('Owner audition stays local in dist-owner and is not part of the customer package')
void dirname
