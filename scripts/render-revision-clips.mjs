import { mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createServer } from 'vite'
import { chromium } from '@playwright/test'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const features = await server.ssrLoadModule('/src/view/features.ts')
const catalog = await server.ssrLoadModule('/src/logic/catalog.ts')
const glance = await server.ssrLoadModule('/src/view/glance.ts')
await server.close()

const fps = 24
const seconds = 7
const frames = fps * seconds
const outDir = '/opt/cursor/artifacts/review-v27'
mkdirSync(outDir, { recursive: true })

const picks = [
  { number: '38', id: 'scan', name: 'Scan' },
  { number: '04', id: 'giggle', name: 'Giggle' },
  { number: '40', id: 'take-left', name: 'Double-take-left' },
  { number: '15', id: 'dizzy', name: 'Dizzy' },
  { number: '15B', id: 'spiral-dizzy', name: 'Spiral-dizzy' },
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 480, height: 640 }, deviceScaleFactor: 1 })
await page.setContent(`<!doctype html><style>
  html,body{margin:0;background:#000;color:#fff;font:600 22px sans-serif}
  .label{position:absolute;top:16px;left:0;right:0;text-align:center;opacity:.9}
  svg{position:absolute;left:45px;top:150px;width:390px;height:390px}
</style>
<body>
  <div class="label" id="label"></div>
  <svg viewBox="0 0 100 100" id="face">
    <g id="glance">
      <g id="el"><path id="pl" fill="#fff" stroke="none"/></g>
      <g id="er"><path id="pr" fill="#fff" stroke="none"/></g>
      <path id="brow-l" d="M22 31 Q32 25 42 31" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" opacity="0"/>
      <path id="brow-r" d="M58 31 Q68 25 78 31" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" opacity="0"/>
      <path id="mouth" fill="#fff"/>
      <path id="sweat" d="M74 30 q2 4 0 6 q-2-2 0-6z" fill="#fff" opacity="0"/>
    </g>
  </svg>
</body>`)

function squash(eye, blink) {
  const s = Math.max(0.08, 1 - blink * 0.92).toFixed(3)
  return `translate(${eye.cx.toFixed(2)} ${eye.cy.toFixed(2)}) scale(1 ${s}) translate(${(-eye.cx).toFixed(2)} ${(-eye.cy).toFixed(2)})`
}

const evidence = []
for (const pick of picks) {
  const safe = `${pick.number}_${pick.id}_${pick.name}_r2.mp4`
  const frameDir = `/tmp/review-v27/${pick.number}`
  mkdirSync(frameDir, { recursive: true })
  const series = []
  for (let frame = 0; frame < frames; frame += 1) {
    const elapsed = (frame / fps) * 1000
    const played = catalog.sampleCandidate(pick.id, elapsed, false, 'soft')
    const art = played.features
    const spiral = art.left.spiral ?? 0
    series.push({
      t: Number(elapsed.toFixed(1)),
      gazeX: Number(played.gazeX.toFixed(4)),
      cy: Number(art.left.cy.toFixed(3)),
      mouth: Number(art.mouth.curve.toFixed(3)),
      brow: Number((art.brow ?? 0).toFixed(3)),
      blink: Number(played.blink.toFixed(3)),
      spiral: Number(spiral.toFixed(3)),
      hL: Number(art.left.h.toFixed(3)),
      hR: Number(art.right.h.toFixed(3)),
    })
    await page.evaluate(
      ({ label, left, right, mouth, glance, ltx, rtx, brow, sweat, spiralOn }) => {
        document.getElementById('label').textContent = label
        const pl = document.getElementById('pl')
        const pr = document.getElementById('pr')
        pl.setAttribute('d', left)
        pr.setAttribute('d', right)
        for (const node of [pl, pr]) {
          node.setAttribute('fill', spiralOn ? 'none' : '#fff')
          node.setAttribute('stroke', spiralOn ? '#fff' : 'none')
          node.setAttribute('stroke-width', spiralOn ? '2.4' : '0')
          node.setAttribute('stroke-linecap', 'round')
          node.setAttribute('stroke-linejoin', 'round')
        }
        document.getElementById('mouth').setAttribute('d', mouth)
        document.getElementById('glance').setAttribute('transform', glance)
        document.getElementById('el').setAttribute('transform', ltx)
        document.getElementById('er').setAttribute('transform', rtx)
        document.getElementById('brow-l').setAttribute('opacity', String(brow))
        document.getElementById('brow-r').setAttribute('opacity', String(brow))
        document.getElementById('sweat').setAttribute('opacity', String(sweat))
      },
      {
        label: `${pick.number}  ${pick.id}  ${pick.name}`,
        left: features.eyePath(art.left),
        right: features.eyePath(art.right),
        mouth: features.mouthPath(art.mouth),
        glance: glance.glanceTransform(played.gazeX, played.gazeY),
        ltx: squash(art.left, played.blink),
        rtx: squash(art.right, played.blink),
        brow: (art.brow ?? 0).toFixed(3),
        sweat: art.sweat.toFixed(3),
        spiralOn: spiral > 0,
      },
    )
    await page.screenshot({ path: `${frameDir}/f${String(frame).padStart(3, '0')}.png` })
  }
  const target = `${outDir}/${safe}`
  execFileSync('ffmpeg', [
    '-y', '-framerate', String(fps), '-i', `${frameDir}/f%03d.png`,
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', target,
  ], { stdio: 'ignore' })
  evidence.push({ number: pick.number, id: pick.id, path: target, fps, seconds, frames: series })
  console.log('clip', pick.number, pick.id)
}

writeFileSync(`${outDir}/sampler-series.json`, JSON.stringify(evidence))
await browser.close()
console.log('rendered', picks.length)
