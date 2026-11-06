import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
    'Motion Buddy customer app, Expressive v2.9.',
    'This zip is the public companion. It does not include the owner audition.',
    'Upload this whole folder to a static host and open index.html.',
    'motion-buddy.html is the same app with the script and styles inlined. It does not load fonts or other remote files.',
    'Opening the file directly is not a secure-page sensor test. Phone tilt and movement need HTTPS.',
    'Sound is on until it is turned off in the menu. The browser still stays quiet until the first tap. Scan, giggle, surprise, yawn, wink, and dizzy play the approved WAV recordings. The chirp is the existing synthesized tone. Spoken clap and level-up lines are embedded for playback and are not separate files. Voice credit, optional: りこ。 https://conte-de-fees.com/voice',
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
    'Kenney Interface Sounds',
    'Created by Kenney (www.kenney.nl). One cue, error_004.ogg, is embedded for the disapproving beep.',
    'License: Creative Commons Zero, CC0. http://creativecommons.org/publicdomain/zero/1.0/',
    'The rest of that pack is not included.',
    '',
    'Spoken lines',
    'Performer: りこ。',
    'Source: https://conte-de-fees.com/voice',
    'The clap and level-up lines are embedded for playback inside the app.',
    'The creator allows commercial app embedding. The raw files are not shipped as a separate download.',
    '',
  ].join('\n'),
)
mkdirSync('/opt/cursor/artifacts', { recursive: true })
const customerJs = readFileSync(join(dist, scriptSrc.replace(/^\//, '')), 'utf8')
for (const term of ['Export review', 'Face audition', 'Owner audition', 'motion-buddy-review', 'Try my companion']) {
  if (customerJs.includes(term)) throw new Error(`Customer bundle contains owner audition text: ${term}`)
}
const zipPath = '/opt/cursor/artifacts/motion-buddy-customer-v2.9.zip'
rmSync(zipPath, { force: true })
execFileSync('zip', ['-r', zipPath, '.'], { cwd: dist })
console.log('Wrote dist/motion-buddy.html and /opt/cursor/artifacts/motion-buddy-customer-v2.9.zip')

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
