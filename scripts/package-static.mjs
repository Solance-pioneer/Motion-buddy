import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
    'Motion Buddy Expressive v2.1 static site.',
    'Upload this whole folder to a static host and open index.html.',
    'motion-buddy.html is the same app with the script and styles inlined. It does not load fonts or other remote files.',
    'Opening the file directly is not a secure-page sensor test. Phone tilt and movement need HTTPS.',
    'On an iPhone, the first tap must be Allow motion on the face. iOS shows the permission prompt only after that tap. Not now leaves the face running. Other browsers start listening when the secure page opens.',
    'This build does not wake a locked phone and is not an Apple Watch app.',
    '',
  ].join('\n'),
)

mkdirSync('/opt/cursor/artifacts', { recursive: true })
execFileSync('zip', ['-r', '/opt/cursor/artifacts/motion-buddy-expressive-v2.1.zip', '.'], { cwd: dist })
console.log('Wrote dist/motion-buddy.html and /opt/cursor/artifacts/motion-buddy-expressive-v2.1.zip')
void dirname
