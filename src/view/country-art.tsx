import benRaw from '../assets/scenes-v2/svg/props/uk_big_ben.svg?raw'
import eiffelRaw from '../assets/scenes-v2/svg/props/france_eiffel_tower.svg?raw'
import libertyRaw from '../assets/scenes-v2/svg/props/usa_statue_of_liberty.svg?raw'
import flagRaw from '../assets/scenes-v2/svg/props/us_flag.svg?raw'
import eagleRaw from '../assets/scenes-v2/svg/props/us_eagle.svg?raw'
import pyramidsRaw from '../assets/scenes-v2/svg/props/egypt_pyramids.svg?raw'
import fujiRaw from '../assets/scenes-v2/svg/props/japan_mount_fuji.svg?raw'
import operaRaw from '../assets/scenes-v2/svg/props/sydney_opera_house.svg?raw'
import kabutoRaw from '../assets/scenes-v2/svg/overlays/japan_kabuto_overlay.svg?raw'
import corkRaw from '../assets/scenes-v2/svg/overlays/australia_cork_hat.svg?raw'

function inner(raw: string) {
  return raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
}

/**
 * Face-local costumes in the supplied 360 space, scaled by the parent.
 * Openings are app copies: the archived SVG files are not rewritten.
 * Real eyes sit near y 86–187 and the mouth near y 241–288 in this space.
 */
export function CountryOverlays() {
  return (
    <g data-part="country-overlays">
      <g data-country-layer="overlay:uk_guard" opacity="0">
        <path data-part="uk-crown" d="M96 132 C90 80 90 6 112 -22 C138 -57 222 -57 248 -22 C270 6 270 80 264 132 Q180 122 96 132Z" fill="#242426" stroke="#424244" strokeWidth="2" />
        <path d="M112 94 C106 48 110 -6 136 -24 M124 100 C120 46 124 2 144 -18 M238 96 C246 36 238 -8 224 -20" stroke="#343436" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path data-part="uk-band" d="M98 128 Q180 116 262 128" stroke="#c8a24a" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path data-part="uk-outline" d="M90 134 Q86 200 112 238 Q180 262 248 238 Q274 200 270 134" stroke="#c8a24a" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle data-part="uk-stud" cx="90" cy="134" r="7" fill="#c8a24a" />
        <circle data-part="uk-stud" cx="270" cy="134" r="7" fill="#c8a24a" />
      </g>
      <g data-country-layer="overlay:france_cafe" opacity="0">
        <ellipse data-part="france-beret" cx="190" cy="46" rx="104" ry="30" fill="#1f2a44" />
        <path d="M92 48 Q120 -8 196 -4 Q276 0 290 42 Q190 26 92 48Z" fill="#26324f" />
        <path d="M196 -4 q4 -14 12 -16" stroke="#26324f" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path data-part="france-ascot" d="M138 308 Q180 294 222 308 L210 324 Q180 316 150 324Z" fill="#c2453f" />
        <path d="M168 314 Q180 356 166 376 L194 376 Q182 356 192 314Z" fill="#d6544c" />
        <circle cx="180" cy="312" r="9" fill="#a83a35" />
      </g>
      <g data-country-layer="overlay:egypt_pharaoh" opacity="0">
        <path d="M70 132 Q76 58 180 48 Q284 58 290 132 L304 272 Q290 292 266 284 L262 250 L98 250 L94 284 Q70 292 56 272Z" fill="#d8b24c" />
        <path d="M56 150 L70 153 M56 172 L70 175 M56 194 L70 197 M56 216 L70 219 M56 238 L70 241 M56 260 L70 263" stroke="#2f4f8f" strokeWidth="8" strokeLinecap="round" />
        <path d="M304 150 L290 153 M304 172 L290 175 M304 194 L290 197 M304 216 L290 219 M304 238 L290 241 M304 260 L290 263" stroke="#2f4f8f" strokeWidth="8" strokeLinecap="round" />
        <rect data-part="egypt-opening" x="72" y="78" width="216" height="230" rx="36" fill="#000" />
        <path d="M84 62 Q180 46 276 62 L274 76 Q180 64 86 76Z" fill="#2f4f8f" />
        <path d="M180 48 q-10 -20 0 -34 q10 14 0 34Z" fill="#c8a24a" />
      </g>
      <g data-country-layer="overlay:japan_kabuto" opacity="0" dangerouslySetInnerHTML={{ __html: inner(kabutoRaw) }} />
      <g data-country-layer="overlay:australia_cork_hat" opacity="0" transform="scale(3.6)" dangerouslySetInnerHTML={{ __html: inner(corkRaw) }} />
    </g>
  )
}

export function CountryBackdrop() {
  return (
    <svg className="country-world" viewBox="0 0 360 360" aria-hidden="true">
      <g data-country-layer="prop:uk_big_ben" opacity="0" dangerouslySetInnerHTML={{ __html: inner(benRaw) }} />
      <g data-country-layer="prop:france_eiffel_tower" opacity="0" dangerouslySetInnerHTML={{ __html: inner(eiffelRaw) }} />
      <g data-country-layer="prop:usa_statue_of_liberty" opacity="0" dangerouslySetInnerHTML={{ __html: inner(libertyRaw) }} />
      <g data-country-layer="prop:us_flag" opacity="0" dangerouslySetInnerHTML={{ __html: inner(flagRaw) }} />
      <g data-country-layer="prop:egypt_pyramids" opacity="0" dangerouslySetInnerHTML={{ __html: inner(pyramidsRaw) }} />
      <g data-country-layer="prop:japan_mount_fuji" opacity="0" dangerouslySetInnerHTML={{ __html: inner(fujiRaw) }} />
      <g transform="scale(3.6)">
        <g data-country-layer="prop:sydney_opera_house" opacity="0" dangerouslySetInnerHTML={{ __html: inner(operaRaw) }} />
        <g data-country-layer="prop:australia_kangaroo" opacity="0">
          <foreignObject x="70" y="42" width="26" height="46" overflow="visible">
            <div className="kangaroo-slot">{"\u{1F998}"}</div>
          </foreignObject>
        </g>
      </g>
    </svg>
  )
}

export function CountryEagle() {
  return (
    <svg className="country-eagle" viewBox="0 0 360 360" aria-hidden="true">
      <g data-country-layer="prop:us_eagle" opacity="0" dangerouslySetInnerHTML={{ __html: inner(eagleRaw) }} />
    </svg>
  )
}
