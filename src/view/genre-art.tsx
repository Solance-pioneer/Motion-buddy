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
  rock: () => (
    <>
      <path d="M22 62 H78" stroke="#c9cdd6" strokeWidth="3" strokeLinecap="round" />
      <path d="M28 62 l2 4 M38 62 l2 4 M50 62 l2 4 M62 62 l2 4" stroke="#f2f4f8" strokeWidth="1.2" />
      <path d="M12 70 l6 -10 M12 70 l8 2" fill="none" stroke="#f2f4f8" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  pop: () => (
    <>
      <path d="M20 36 l6 2 -4 5 2 -6 5 -1 -6 -1 z" fill="#ffd36b" />
      <path d="M74 36 l6 2 -4 5 2 -6 5 -1 -6 -1 z" fill="#ffd36b" />
      <path d="M18 40 H46 M54 40 H82" stroke="#7ec8ff" strokeWidth="1.4" />
      <circle data-flash cx="16" cy="18" r="1" fill="#fff4c2" />
      <circle data-flash cx="84" cy="20" r="1" fill="#ffd0ea" />
    </>
  ),
  jazz: () => (
    <>
      <ellipse cx="50" cy="16" rx="18" ry="6" fill="#243044" />
      <path d="M36 16 Q50 8 64 16" fill="none" stroke="#1b2433" strokeWidth="2" />
      <path d="M78 48 q8 16 2 28 q-6 -8 -2 -20" fill="none" stroke="#d7c07a" strokeWidth="1.6" />
      <circle cx="80" cy="78" r="3" fill="none" stroke="#d7c07a" strokeWidth="1.2" />
    </>
  ),
  blues: () => (
    <>
      <ellipse cx="50" cy="14" rx="22" ry="5" fill="#2c3340" />
      <path d="M30 14 Q50 6 70 14 L68 18 Q50 12 32 18 Z" fill="#1d2430" />
      <path d="M40 70 h20" stroke="#c7ccd4" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 70 v6 M58 70 v6 M44 76 h12" stroke="#c7ccd4" strokeWidth="1.2" />
    </>
  ),
  classical: () => (
    <>
      <path d="M34 66 h32" stroke="#f4f6f8" strokeWidth="2.4" />
      <path d="M42 66 q8 8 16 0" fill="none" stroke="#f4f6f8" strokeWidth="1.4" />
      <path d="M74 24 l6 22" stroke="#e7d7a1" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="80" cy="48" r="1.4" fill="#e7d7a1" />
    </>
  ),
  electronic: () => (
    <>
      <path d="M16 38 H46 M54 38 H84" stroke="#39e7ff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <circle data-flash cx="24" cy="38" r="1.2" fill="#39e7ff" />
      <circle data-flash cx="36" cy="38" r="1.2" fill="#7dffe1" />
      <circle data-flash cx="64" cy="38" r="1.2" fill="#39e7ff" />
      <circle data-flash cx="76" cy="38" r="1.2" fill="#7dffe1" />
    </>
  ),
  metal: () => (
    <>
      <path d="M20 64 H80" stroke="#b9bec8" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M26 64 l-2 -7 M38 64 l-2 -8 M50 64 l-2 -9 M62 64 l-2 -8 M74 64 l-2 -7" stroke="#eceff4" strokeWidth="1.4" />
    </>
  ),
  punk: () => (
    <>
      <path d="M34 18 l4 -8 4 8 4 -10 4 10 4 -8 4 8" fill="none" stroke="#ff5a7a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M24 66 l6 4 -6 4" fill="none" stroke="#d7dde6" strokeWidth="1.2" />
      <path d="M76 66 l-6 4 6 4" fill="none" stroke="#d7dde6" strokeWidth="1.2" />
    </>
  ),
}
