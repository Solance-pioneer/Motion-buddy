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
  reggae: () => (
    <>
      <path d="M24 16 Q50 6 76 16 L74 20 Q50 12 26 20 Z" fill="#1f8a4c" />
      <path d="M26 16 H74" stroke="#f2c14e" strokeWidth="2" />
      <path d="M27 18.5 H73" stroke="#d23b3b" strokeWidth="1.4" />
      <path d="M16 28 q4 -6 6 0 q2 4 -1 6" fill="none" stroke="#f2c14e" strokeWidth="1.2" />
      <path d="M84 30 q-4 -6 -6 0 q-2 4 1 6" fill="none" stroke="#1f8a4c" strokeWidth="1.2" />
    </>
  ),
  funk: () => (
    <>
      <path d="M18 34 l8 2 -6 6 3 -7 6 -1 -7 -1 z" fill="#ffd23a" />
      <path d="M74 34 l8 2 -6 6 3 -7 6 -1 -7 -1 z" fill="#ffd23a" />
      <path d="M16 40 H46 M54 40 H84" stroke="#ff4fa3" strokeWidth="2.2" />
      <path data-flash d="M22 78 h10 M68 78 h10" stroke="#fff1a8" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  soul: () => (
    <>
      <path d="M36 66 h28" stroke="#6b2d5b" strokeWidth="3" />
      <path d="M44 66 q6 8 12 0" fill="#4a1d40" />
      <path d="M78 52 v22" stroke="#d7dde6" strokeWidth="1.4" />
      <circle cx="78" cy="50" r="3.2" fill="#c9ced6" />
    </>
  ),
  gospel: () => (
    <>
      <path d="M28 60 Q50 50 72 60 L68 72 Q50 64 32 72 Z" fill="#f4f1e8" opacity="0.9" />
      <ellipse data-flash cx="50" cy="12" rx="16" ry="4" fill="#fff6c8" opacity="0.45" />
    </>
  ),
  folk: () => (
    <>
      <circle cx="34" cy="14" r="2.2" fill="#f2a3b5" />
      <circle cx="50" cy="10" r="2.2" fill="#f6d56a" />
      <circle cx="66" cy="14" r="2.2" fill="#9fd0ff" />
      <path d="M76 58 v22" stroke="#c9843a" strokeWidth="1.4" />
      <ellipse cx="76" cy="82" rx="5" ry="3.4" fill="none" stroke="#c9843a" strokeWidth="1.2" />
    </>
  ),
  ambient: () => (
    <>
      <circle cx="22" cy="18" r="3" fill="#b7f3ff" opacity="0.45" />
      <circle cx="78" cy="16" r="2.4" fill="#d7d0ff" opacity="0.45" />
      <circle data-flash cx="50" cy="8" r="2" fill="#fff6d8" opacity="0.6" />
    </>
  ),
  'lo-fi': () => (
    <>
      <ellipse cx="50" cy="16" rx="22" ry="6" fill="#3d4a5c" />
      <path d="M18 40 h8 v10 h-8 z M74 40 h8 v10 h-8 z" fill="#2c3544" />
      <path d="M26 44 H74" stroke="#2c3544" strokeWidth="1.6" />
      <path d="M84 70 q2 -6 0 -8" fill="none" stroke="#d7dde6" strokeWidth="1" />
      <path d="M80 78 h8 v6 h-8 z" fill="#efe7dc" />
    </>
  ),
  'k-pop': () => (
    <>
      <path d="M58 12 q10 4 8 14" fill="none" stroke="#ff4fa3" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 74 c2 -5 6 -5 8 0 c2 -5 6 -5 8 0 c0 6 -8 9 -8 9 c0 0 -8 -3 -8 -9" fill="none" stroke="#ff4fa3" strokeWidth="1.3" />
    </>
  ),
  latin: () => (
    <>
      <circle cx="18" cy="28" r="3" fill="#f2c14e" />
      <path d="M18 31 v10" stroke="#c9843a" strokeWidth="1.2" />
      <circle cx="84" cy="30" r="3" fill="#f2c14e" />
      <path d="M84 33 v10" stroke="#c9843a" strokeWidth="1.2" />
      <circle cx="50" cy="12" r="3" fill="#ff7aa2" />
      <path d="M50 9 v6 M47 12 h6" stroke="#f6d56a" strokeWidth="0.8" />
    </>
  ),
  synthwave: () => (
    <>
      <path d="M16 34 H46 V44 H16 Z M54 34 H84 V44 H54 Z" fill="#241433" stroke="#ff4fd8" strokeWidth="1" opacity="0.85" />
      <path d="M20 38 H42 M58 38 H80 M22 34 V44 M70 34 V44" stroke="#39e7ff" strokeWidth="0.6" />
    </>
  ),
  'drum-and-bass': () => (
    <>
      <path d="M12 36 h14 v16 h-14 z M74 36 h14 v16 h-14 z" fill="#1d2430" />
      <path d="M26 42 H74" stroke="#1d2430" strokeWidth="2" />
      <path d="M88 28 h6 M90 34 h8 M88 40 h6" stroke="#7ec8ff" strokeWidth="1" strokeLinecap="round" />
    </>
  ),
}
