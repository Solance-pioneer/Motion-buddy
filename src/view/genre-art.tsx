import type { ReactNode } from 'react'
import type { GenreLook } from '../logic/genre-pack.ts'

/** Props and colours only. Eyes are drawn later, so nothing here can cover them. */
export const GENRE_ART: Record<GenreLook, () => ReactNode> = {
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
    </>
  ),
}
