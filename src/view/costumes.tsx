/**
 * App-side registration of the four supplied costumes.
 * Archived originals stay in src/assets/scenes-v1/costumes/svg/.
 * These shapes are only moved and opened so Buddy's live eyes (about y 21–55)
 * and mouth (about y 66–85) sit inside the frames. The face itself is not resized.
 */
export function Costumes() {
  return (
    <g data-part="costume" opacity="0">
      <g data-costume="ninja" data-part="costume-mask" opacity="0">
        <path d="M12 66 Q8 8 50 3 Q92 8 88 66 L80 88 Q50 94 20 88 Z" fill="#23262e" />
        <path data-part="costume-brow" d="M14 8 Q50 5 86 8 L84 15 Q50 12 16 15 Z" fill="#b65b61" />
        <path data-part="costume-brow" d="M84 7 Q97 3 99 12 L86 14 L96 20 L84 16 Z" fill="#b65b61" />
        <path data-part="costume-aperture" d="M14 22 Q14 15 24 15 L76 15 Q86 15 86 22 L86 56 Q86 62 76 62 L24 62 Q14 62 14 56 Z" fill="#050608" />
        <path data-part="costume-chin" d="M22 58 Q50 54 78 58 L74 86 Q50 92 26 86 Z" fill="#303440" />
      </g>
      <g data-costume="cord_hero" data-part="hero-cape-layer" opacity="0">
        <path data-part="hero-cape" d="M25 59C43 70 61 69 75 59C86 80 101 98 115 117C87 111 74 131 54 126C30 120 18 128 5 121C18 105 22 82 25 59Z" fill="#bd3d47" stroke="#ee7470" strokeWidth="1.4" strokeLinejoin="round" />
      </g>
      <g data-costume="cord_hero" data-part="costume-mask" opacity="0">
        <circle cx="50" cy="45" r="43" fill="#124868" stroke="#387d9a" strokeWidth="1.2" />
        <path d="M13 28Q32 10 50 23Q68 10 87 28L83 53Q68 64 50 51Q32 64 17 53Z" fill="#182333" stroke="#f0c56a" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
      <g data-costume="racer" data-part="costume-mask" opacity="0">
        <rect x="8" y="2" width="84" height="90" rx="30" fill="#e7e3d6" />
        <path data-part="costume-brow" d="M46 5 L55 4 L60 15 L48 15 Z" fill="#d77f43" />
        <rect data-part="costume-aperture" x="14" y="16" width="72" height="44" rx="18" fill="#080a0c" />
        <path d="M22 20 Q50 16 78 20" fill="none" stroke="#aeb9ba" strokeWidth="2" strokeLinecap="round" />
        <path data-part="costume-chin" d="M28 64 L72 64 L72 90 L28 90 Z" fill="none" />
        <path d="M30 86 L70 86" stroke="#a6aaa8" strokeWidth="1.6" strokeLinecap="round" />
        <g data-part="costume-wind" opacity="0">
          <path d="M2 42 h12 M0 52 h10 M3 62 h11" fill="none" stroke="#d5ddd8" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </g>
      <g data-costume="sheet_ghost" data-part="costume-mask" opacity="0">
        <path d="M10 78 C 2 22 8 4 50 3 C 92 4 98 22 90 78 Q84 72 78 86 Q70 76 62 90 L38 90 Q30 76 22 86 Q16 72 10 78 Z" fill="#edece5" />
        <rect data-part="costume-aperture" x="16" y="16" width="68" height="44" rx="18" fill="#08090a" />
        <path data-part="costume-brow" d="M22 15 Q50 6 78 15 L76 18 Q50 11 24 18 Z" fill="#edece5" />
        <path data-part="costume-chin" d="M28 62 L72 62 L72 90 L28 90 Z" fill="none" />
        <path d="M26 70 Q28 74 30 78 M74 70 Q72 74 70 78" fill="none" stroke="#c3c5c2" strokeWidth="1" strokeLinecap="round" />
      </g>
    </g>
  )
}
