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
      <g data-part="anime-speed" opacity="0" pointerEvents="none">
        <g stroke="#80c3d2" strokeLinecap="round" fill="none" opacity="0.75">
          <path d="M0 10L28 19M0 27L18 30M0 49L13 49M0 73L23 67M0 96L33 81M72 8L100 1M83 26L100 23M89 48L100 48M78 72L100 79M70 85L98 99" strokeWidth="1.15" />
          <path d="M0 19L17 23M0 38L10 39M0 85L14 80M86 16L100 12M92 60L100 62M81 88L100 97" strokeWidth="0.4" />
        </g>
      </g>
      <g data-part="car-reaction">
        <g data-part="squashed-cheeks" opacity="0" pointerEvents="none">
          <path d="M12 58C16 54 26 54 32 58C35 60 33 65 28 67C21 70 12 67 10 63C9 61 10 59 12 58Z M88 58C84 54 74 54 68 58C65 60 67 65 72 67C79 70 88 67 90 63C91 61 90 59 88 58Z" fill="#f7a8b7" fillOpacity="0.78" />
          <g fill="none" stroke="#fcd7dc" strokeWidth="1.1" strokeLinecap="round">
            <path d="M13 58Q20 55 28 58 M72 58Q80 55 87 58" />
          </g>
          <g fill="none" stroke="#b7657d" strokeWidth="0.9" strokeLinecap="round">
            <path d="M13 62L18 64 M19 60L24 63 M27 60L30 62 M87 62L82 64 M81 60L76 63 M73 60L70 62" />
          </g>
          <g fill="none" stroke="#e2eaf0" strokeOpacity="0.7" strokeWidth="0.65" strokeLinecap="round">
            <path d="M6 55L9 57 M5 60L8 61 M7 66L10 65 M94 55L91 57 M95 60L92 61 M93 66L90 65" />
          </g>
        </g>
      <g data-part="glance">
        <g data-part="eye-l" fill="#ffffff" stroke="none"><path data-part="eye-l-path" /></g>
        <g data-part="eye-r" fill="#ffffff" stroke="none"><path data-part="eye-r-path" /></g>
        <path data-part="brow-l" d="M22 31 Q32 25 42 31" fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" opacity="0" />
        <path data-part="brow-r" d="M58 31 Q68 25 78 31" fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" opacity="0" />
        <path data-part="mouth" fill="#ffffff" stroke="none" />
        <ellipse data-part="genre-mouth" cx="50" cy="70" rx="8" ry="5.5" fill="#ffffff" opacity={wide && !reduced ? 1 : 0} />
        {genre === 'emo' && pulse && !reduced ? <path data-part="genre-squeeze" d="M22 36 Q32 42 42 36 M58 36 Q68 42 78 36" fill="none" stroke="#ffffff" strokeWidth="1.3" opacity="0.4" /> : null}
        {genre === 'lo-fi' || genre === 'ambient' ? <path data-part="genre-lids" d="M22 36 Q32 40 42 36 M58 36 Q68 40 78 36" fill="none" stroke="#ffffff" strokeWidth="1.1" opacity="0.32" /> : null}
        <ellipse data-part="blush-l" cx="22" cy="58" rx="4.2" ry="2.2" fill="#ff8fa3" opacity="0" />
        <ellipse data-part="blush-r" cx="78" cy="58" rx="4.2" ry="2.2" fill="#ff8fa3" opacity="0" />
        <path data-part="sweat" d="M74 30 q2 4 0 6 q-2-2 0-6z" fill="#ffffff" opacity="0" />
        <path data-part="anger" d="M24 24 l5 4 M76 24 l-5 4" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0" />
        <g data-part="speed" opacity="0">
          <path d="M84 32 h8 M86 40 h6 M84 48 h8" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </g>
        <g data-part="racing-helmet" opacity="0" pointerEvents="none">
          <path d="M50 3C19 3 6 24 6 49L8 73Q10 90 30 91H70Q90 90 92 73L94 49C94 24 81 3 50 3Z M24 19H76Q88 22 88 36V48Q87 61 73 61H27Q13 61 12 48V36Q12 22 24 19Z" fillRule="evenodd" fill="#e5e2d9" stroke="#8eabae" strokeWidth="1.1" />
          <path d="M45 4H55L58 18H42Z" fill="#4d9eae" />
          <path d="M15 66Q50 74 85 66L83 77Q50 85 17 77Z" fill="#b6c8c5" />
          <path d="M28 86H72" stroke="#7c9598" strokeWidth="1.5" />
          <ellipse cx="89" cy="49" rx="4.4" ry="7" fill="#527e88" stroke="#c5dedb" strokeWidth="1" />
          <path d="M89 52Q91 70 68 65" fill="none" stroke="#90b9bd" strokeWidth="2.2" />
          <rect x="57" y="61.5" width="13" height="7" rx="3.5" fill="#253940" stroke="#8ab6be" strokeWidth="1.1" />
          <path d="M61 64V66M64 64V66M67 64V66" stroke="#9abdc0" strokeWidth="0.6" />
        </g>
      </g>
      <g data-part="glass-crack" opacity="0" pointerEvents="none">
        <g fill="none" stroke="#b2d9dd" strokeOpacity="0.8" strokeWidth="0.55" strokeLinecap="round" strokeLinejoin="round">
          <path d="M50 45L39 32L35 18L27 9 M50 45L63 30L66 16L77 8 M50 45L73 47L87 39L96 42 M50 45L62 61L58 75L66 91 M50 45L36 59L18 62L6 73 M50 45L32 43L18 35L5 36 M39 32L27 30L20 23 M63 30L76 27L82 19 M62 61L77 68L81 79 M36 59L34 76L25 86 M73 47L80 56L94 59" />
          <path d="M44 40L52 37L57 45L53 53L44 49Z" stroke="#d5e9e6" />
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
