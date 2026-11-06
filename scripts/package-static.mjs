import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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
    'Motion Buddy customer app, Expressive v2.7.',
    'This zip is the public companion. It does not include the owner audition.',
    'Upload this whole folder to a static host and open index.html.',
    'motion-buddy.html is the same app with the script and styles inlined. It does not load fonts or other remote files.',
    'Opening the file directly is not a secure-page sensor test. Phone tilt and movement need HTTPS.',
    'On an iPhone, the first tap must be Allow motion on the face. iOS shows the permission prompt only after that tap. Not now leaves the face running. Other browsers start listening when the secure page opens.',
    'This build does not wake a locked phone and is not an Apple Watch app.',
    '',
  ].join('\n'),
)

mkdirSync('/opt/cursor/artifacts', { recursive: true })
const customerJs = readFileSync(join(dist, scriptSrc.replace(/^\//, '')), 'utf8')
for (const term of ['Export review', 'Face audition', 'Owner audition', 'motion-buddy-review', 'Try my companion']) {
  if (customerJs.includes(term)) throw new Error(`Customer bundle contains owner audition text: ${term}`)
}
const zipPath = '/opt/cursor/artifacts/motion-buddy-customer-v2.7.zip'
rmSync(zipPath, { force: true })
execFileSync('zip', ['-r', zipPath, '.'], { cwd: dist })
console.log('Wrote dist/motion-buddy.html and /opt/cursor/artifacts/motion-buddy-customer-v2.7.zip')

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
const ownerZip = '/opt/cursor/artifacts/motion-buddy-owner-audition.zip'
rmSync(ownerZip, { force: true })
execFileSync('zip', ['-r', ownerZip, '.'], { cwd: ownerDist })
console.log('Wrote dist-owner/owner-audition.html and /opt/cursor/artifacts/motion-buddy-owner-audition.zip')
void dirname
