import { useLayoutEffect, useRef } from 'react'
import type { FaceHandles } from './applyPose.ts'
import { Costumes } from './costumes.tsx'
import { CountryOverlays } from './country-art.tsx'
import type { GenreId, GenreLook, HeadbangSpeed } from '../logic/genres.ts'
import { genreById, headbangTilt } from '../logic/genre-pack.ts'
import { GENRE_ART } from './genre-art.tsx'

export function Face({ onReady, genre = 'none', pulse = false, party = false, reduced = false, wide = false, bang = 'medium', flash = false }: { onReady: (handles: FaceHandles) => void; genre?: GenreId; pulse?: boolean; party?: boolean; reduced?: boolean; wide?: boolean; bang?: HeadbangSpeed; flash?: boolean }) {
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
      <GenreWear genre={genre} pulse={pulse} party={party} reduced={reduced} bang={bang} flash={flash} />
      <g data-part="glance">
        <g data-part="eye-l" fill="#ffffff" stroke="none"><path data-part="eye-l-path" /></g>
        <g data-part="eye-r" fill="#ffffff" stroke="none"><path data-part="eye-r-path" /></g>
        <path data-part="brow-l" d="M22 31 Q32 25 42 31" fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" opacity="0" />
        <path data-part="brow-r" d="M58 31 Q68 25 78 31" fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" opacity="0" />
        <path data-part="mouth" fill="#ffffff" stroke="none" />
        <ellipse data-part="genre-mouth" cx="50" cy="70" rx="8" ry="5.5" fill="#ffffff" opacity={wide && !reduced ? 1 : 0} />
        {genre === 'emo' && pulse && !reduced ? <path data-part="genre-squeeze" d="M22 36 Q32 42 42 36 M58 36 Q68 42 78 36" fill="none" stroke="#ffffff" strokeWidth="1.3" opacity="0.4" /> : null}
        {genre === 'lo-fi' ? <path data-part="genre-lids" d="M22 36 Q32 40 42 36 M58 36 Q68 40 78 36" fill="none" stroke="#ffffff" strokeWidth="1.1" opacity="0.32" /> : null}
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

/** Wear sits behind the live eyes and mouth, so shades cannot hide them. */
function GenreWear({ genre, pulse, party, reduced, bang, flash }: { genre: GenreId; pulse: boolean; party: boolean; reduced: boolean; bang: HeadbangSpeed; flash: boolean }) {
  const entry = genre === 'none' ? undefined : genreById(genre)
  if (!entry) return null
  const Art = GENRE_ART[entry.id as GenreLook]
  const live = pulse && !reduced
  const scale = live ? (party ? entry.beat.partyScale : entry.beat.scale) : 1
  const tilt = !live ? 0 : entry.reaction === 'headbang' ? headbangTilt(entry.beat.tilt, bang, party) : entry.beat.tilt * (party ? 1.4 : 1)
  const drop = !live ? 0 : entry.reaction === 'pogo' ? -3.2 : entry.reaction === 'squash' ? 1.8 : entry.reaction === 'nod' || entry.reaction === 'heavy' || entry.reaction === 'offbeat' ? (party ? 2.2 : 1.3) : entry.reaction === 'kick' || entry.reaction === 'jitter' ? (party ? -2 : -1.1) : 0
  return (
    <g
      data-part="genre"
      data-genre={entry.id}
      data-pack={entry.pack}
      data-pulse={live ? '1' : '0'}
      data-flash-on={live && flash ? '1' : '0'}
      data-party={party && !reduced ? '1' : '0'}
      data-reduced={reduced ? '1' : '0'}
      data-reaction={entry.reaction}
      pointerEvents="none"
      transform={live ? `translate(50 42) translate(0 ${drop}) rotate(${tilt}) scale(${scale}) translate(-50 -42)` : undefined}
    >
      <g data-idle={entry.idle}>{Art()}</g>
    </g>
  )
}
