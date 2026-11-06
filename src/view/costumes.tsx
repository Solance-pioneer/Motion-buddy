/** Supplied 360-space overlays, scaled into the live 100-unit face. Eyes and mouth stay above this group. */
export function Costumes() {
  return (
    <g data-part="costume" transform="scale(0.277778)" opacity="0">
      <g data-costume="ninja" data-part="costume-mask" opacity="0">
        <path d="M69 189 Q55 80 180 70 Q303 80 291 189 L274 248 Q180 271 86 248Z" fill="#23262e" />
        <path d="M79 132 Q180 100 281 132 L275 187 Q180 203 85 187Z" fill="#050608" />
        <path d="M66 113 Q180 88 294 113 L291 137 Q180 111 69 137Z" fill="#b65b61" />
        <path d="M288 116 Q330 96 337 127 L300 133 L330 153 L295 145Z" fill="#b65b61" />
        <path d="M92 203 Q180 186 268 203 L258 246 Q180 261 102 246Z" fill="#303440" />
      </g>
      <g data-costume="cord_hero" data-part="costume-mask" opacity="0">
        <path d="M80 130 Q180 90 280 130 L265 198 Q180 183 95 198Z" fill="#62458b" />
        <path d="M145 122 Q180 103 212 123 L203 133 Q178 118 155 135Z" fill="#eed28d" />
        <path d="M266 171 L294 166 L286 191 L268 190Z" fill="#9b78c5" />
      </g>
      <g data-costume="racer" data-part="costume-mask" opacity="0">
        <rect x="48" y="64" width="264" height="225" rx="105" fill="#e7e3d6" />
        <path d="M164 67 L191 65 L207 115 L177 113Z" fill="#d77f43" />
        <rect x="65" y="121" width="230" height="126" rx="55" fill="#080a0c" />
        <path d="M76 130 Q180 105 284 130" fill="none" stroke="#aeb9ba" strokeWidth="7" strokeLinecap="round" />
        <path d="M114 266 L247 266" stroke="#a6aaa8" strokeWidth="5" strokeLinecap="round" />
        <g data-part="costume-wind" opacity="0">
          <path d="M20 150 h34 M12 180 h28 M24 210 h30" fill="none" stroke="#d5ddd8" strokeWidth="6" strokeLinecap="round" />
        </g>
      </g>
      <g data-costume="sheet_ghost" data-part="costume-mask" opacity="0">
        <path d="M65 282 L68 155 Q72 60 180 57 Q288 60 292 155 L295 282 Q276 263 259 282 Q239 263 219 282 Q199 264 180 282 Q160 264 140 282 Q120 263 101 282 Q83 264 65 282Z" fill="#edece5" />
        <rect x="79" y="122" width="202" height="117" rx="57" fill="#08090a" />
        <path d="M92 252 Q99 257 103 266 M267 252 Q260 257 256 266" fill="none" stroke="#c3c5c2" strokeWidth="3" strokeLinecap="round" />
      </g>
    </g>
  )
}
