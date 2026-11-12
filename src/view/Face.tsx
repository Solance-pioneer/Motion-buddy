import { useLayoutEffect, useRef, type ReactNode } from 'react'
import type { FaceHandles } from './applyPose.ts'
import { Costumes } from './costumes.tsx'
import { CountryOverlays } from './country-art.tsx'
import type { GenreId } from '../logic/genres.ts'

export function Face({ onReady, genre = 'none', pulse = false, party = false, reduced = false }: { onReady: (handles: FaceHandles) => void; genre?: GenreId; pulse?: boolean; party?: boolean; reduced?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useLayoutEffect(() => {
    const face = svgRef.current
    if (!face) return
    const pick = (part: string) => {
      const node = face.querySelector(`[data-part="${part}"]`)
      if (!node) throw new Error(`Motion Buddy is missing ${part}`)
      return node
    }
    onReady({
      glance: pick('glance') as SVGGElement,
      eyeL: pick('eye-l') as SVGGElement,
      eyeR: pick('eye-r') as SVGGElement,
      eyePathL: pick('eye-l-path') as SVGPathElement,
      eyePathR: pick('eye-r-path') as SVGPathElement,
      browL: pick('brow-l') as SVGPathElement,
      browR: pick('brow-r') as SVGPathElement,
      mouth: pick('mouth') as SVGPathElement,
      blushL: pick('blush-l') as SVGEllipseElement,
      blushR: pick('blush-r') as SVGEllipseElement,
      sweat: pick('sweat') as SVGPathElement,
      anger: pick('anger') as SVGPathElement,
      speed: pick('speed') as SVGGElement,
    })
  }, [onReady])

  return (
    <svg ref={svgRef} className="face" viewBox="0 0 100 100" aria-hidden="true" data-testid="face">
      <Costumes />
      <g transform="scale(0.277778)">
        <CountryOverlays />
      </g>
      <GenreWear genre={genre} pulse={pulse} party={party} reduced={reduced} />
      <g data-part="glance">
        <g data-part="eye-l" fill="#ffffff" stroke="none"><path data-part="eye-l-path" /></g>
        <g data-part="eye-r" fill="#ffffff" stroke="none"><path data-part="eye-r-path" /></g>
        <path data-part="brow-l" d="M22 31 Q32 25 42 31" fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" opacity="0" />
        <path data-part="brow-r" d="M58 31 Q68 25 78 31" fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" opacity="0" />
        <path data-part="mouth" fill="#ffffff" stroke="none" />
        <ellipse data-part="blush-l" cx="22" cy="58" rx="4.2" ry="2.2" fill="#ff8fa3" opacity="0" />
        <ellipse data-part="blush-r" cx="78" cy="58" rx="4.2" ry="2.2" fill="#ff8fa3" opacity="0" />
        <path data-part="sweat" d="M74 30 q2 4 0 6 q-2-2 0-6z" fill="#ffffff" opacity="0" />
        <path data-part="anger" d="M24 24 l5 4 M76 24 l-5 4" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0" />
        <g data-part="speed" opacity="0">
          <path d="M84 32 h8 M86 40 h6 M84 48 h8" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </g>
      <g data-part="costume-occlude" data-costume="ninja" opacity="0" pointerEvents="none">
        <path d="M14 58 L86 58 L80 88 Q50 94 20 88 Z" fill="#303440" />
      </g>
      <g data-part="costume-occlude" data-costume="racer" opacity="0" pointerEvents="none">
        <path d="M10 58 L90 58 L90 74 Q90 94 68 94 L32 94 Q10 94 10 74 Z" fill="#e7e3d6" />
      </g>
      <g data-part="costume-occlude" data-costume="sheet_ghost" opacity="0" pointerEvents="none">
        <path d="M16 58 L84 58 L86 78 Q78 72 70 86 Q62 76 50 90 Q38 76 30 86 Q22 72 14 78 Z" fill="#edece5" />
      </g>
    </svg>
  )
}

const GENRE_ART: Record<Exclude<GenreId, 'none'>, () => ReactNode> = {
  indie: () => (
    <>
      <ellipse cx="50" cy="16" rx="26" ry="8" fill="#2f3d55" />
      <path d="M24 16 Q50 8 76 16 L74 20 Q50 14 26 20 Z" fill="#243044" />
      <path d="M18 62 Q22 78 28 84" fill="none" stroke="#8d3b3b" strokeWidth="4" strokeLinecap="round" />
      <path d="M82 62 Q78 78 72 84" fill="none" stroke="#8d3b3b" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  'hip-hop': () => (
    <>
      <path d="M22 74 Q30 86 38 76" fill="none" stroke="#e2c56a" strokeWidth="3" strokeLinecap="round" />
      <path d="M78 74 Q70 86 62 76" fill="none" stroke="#e2c56a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="30" cy="80" r="1.6" fill="#f3e2a2" />
      <circle cx="70" cy="80" r="1.6" fill="#f3e2a2" />
    </>
  ),
  country: () => (
    <>
      <ellipse cx="50" cy="14" rx="28" ry="6" fill="#8a5a2b" />
      <path d="M22 14 Q50 2 78 14 L74 18 Q50 10 26 18 Z" fill="#6d4520" />
      <path d="M20 58 Q24 70 30 74" fill="none" stroke="#234e70" strokeWidth="4" strokeLinecap="round" />
      <path d="M80 58 Q76 70 70 74" fill="none" stroke="#234e70" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  disco: () => (
    <>
      <circle cx="50" cy="10" r="6" fill="#d9dde6" stroke="#9aa3b5" strokeWidth="0.6" />
      <path d="M47 7 L53 13 M53 7 L47 13 M50 5 V15 M45 10 H55" stroke="#ffffff" strokeWidth="0.4" />
      <circle data-flash cx="18" cy="22" r="1.1" fill="#fff4c2" />
      <circle data-flash cx="82" cy="24" r="1.1" fill="#d7f3ff" />
      <circle data-flash cx="30" cy="8" r="0.8" fill="#ffd0ea" />
      <circle data-flash cx="70" cy="9" r="0.8" fill="#fff4c2" />
      <ellipse cx="32" cy="40" rx="14" ry="8" fill="#1c2430" opacity="0.28" />
      <ellipse cx="68" cy="40" rx="14" ry="8" fill="#1c2430" opacity="0.28" />
    </>
  ),
  'rave-iator': () => (
    <>
      <path d="M16 36 Q32 28 46 36 Q32 44 16 36 Z" fill="#39ffb0" opacity="0.34" />
      <path d="M54 36 Q68 28 84 36 Q68 44 54 36 Z" fill="#ff4fd8" opacity="0.34" />
      <path d="M46 36 H54" stroke="#f7ff6a" strokeWidth="1.2" />
      <path data-flash d="M12 70 V84" stroke="#39ffb0" strokeWidth="2.4" strokeLinecap="round" />
      <path data-flash d="M88 70 V84" stroke="#ff4fd8" strokeWidth="2.4" strokeLinecap="round" />
      <circle data-flash cx="22" cy="18" r="1.3" fill="#39ffb0" />
      <circle data-flash cx="78" cy="18" r="1.3" fill="#ff4fd8" />
    </>
  ),
}

/** Wear sits behind the live eyes and mouth, so shades cannot hide them. */
function GenreWear({ genre, pulse, party, reduced }: { genre: GenreId; pulse: boolean; party: boolean; reduced: boolean }) {
  if (genre === 'none') return null
  const Art = GENRE_ART[genre]
  const live = pulse && !reduced
  const scale = live ? (party ? 1.08 : 1.04) : 1
  return (
    <g
      data-part="genre"
      data-genre={genre}
      data-pulse={live ? '1' : '0'}
      data-reduced={reduced ? '1' : '0'}
      pointerEvents="none"
      transform={`translate(50 42) scale(${scale}) translate(-50 -42)`}
    >
      {Art()}
    </g>
  )
}
