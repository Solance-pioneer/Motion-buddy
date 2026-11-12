import type { ReactNode } from 'react'
import type { GenreLook } from '../logic/genre-pack.ts'

/** Props and colours only. Eyes are drawn later, so glasses cannot hide them. */
export const GENRE_ART: Record<GenreLook, () => ReactNode> = {
  pop: () => (
    <>
      <path d="M74 36 h8 v8 h-8 z" fill="#2c3544" />
      <circle cx="86" cy="40" r="2.2" fill="#d7dde6" />
      <path d="M78 36 v-8" stroke="#2c3544" strokeWidth="1.2" />
      <circle data-flash cx="18" cy="22" r="1.1" fill="#fff4c2" />
      <circle data-flash cx="30" cy="14" r="0.8" fill="#ffd0ea" />
      <circle data-flash cx="62" cy="16" r="0.9" fill="#fff4c2" />
    </>
  ),
  rock: () => (
    <>
      <path d="M78 58 l6 10 l-8 2 z" fill="#f2c14e" />
      <path d="M16 38 Q32 30 46 38 Q32 46 16 38 Z" fill="#1c2430" opacity="0.28" />
      <path d="M54 38 Q68 30 84 38 Q68 46 54 38 Z" fill="#1c2430" opacity="0.28" />
      <path d="M46 38 H54" stroke="#c9cdd6" strokeWidth="1.2" />
    </>
  ),
  'hip-hop': () => (
    <>
      <rect x="14" y="64" width="16" height="12" rx="2" fill="#2a3140" />
      <circle cx="18" cy="70" r="2" fill="#9aa3b5" />
      <circle cx="26" cy="70" r="2" fill="#9aa3b5" />
      <path d="M16 42 h8 v8 h-8 z M76 42 h8 v8 h-8 z" fill="#243044" />
      <path d="M24 46 H76" stroke="#243044" strokeWidth="1.6" />
    </>
  ),
  electronic: () => (
    <>
      <path d="M14 40 h10 v10 h-10 z M76 40 h10 v10 h-10 z" fill="#1d2430" />
      <path d="M24 45 H76" stroke="#1d2430" strokeWidth="1.8" />
      <circle cx="84" cy="22" r="6" fill="none" stroke="#39e7ff" strokeWidth="1" />
      <circle cx="84" cy="22" r="1.4" fill="#39e7ff" />
      <circle data-flash cx="50" cy="10" r="2" fill="#7dffe1" opacity="0.7" />
    </>
  ),
  'k-pop': () => (
    <>
      <path d="M16 62 v14" stroke="#ff4fa3" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16" cy="60" r="3" fill="#ffd0ea" />
      <path d="M74 68 c2 -5 6 -5 8 0 c2 -5 6 -5 8 0 c0 6 -8 9 -8 9 c0 0 -8 -3 -8 -9" fill="none" stroke="#ff4fa3" strokeWidth="1.3" />
      <circle data-flash cx="70" cy="18" r="1" fill="#fff4c2" />
    </>
  ),
  classical: () => (
    <>
      <ellipse cx="32" cy="40" rx="12" ry="7" fill="#1c2430" opacity="0.22" />
      <ellipse cx="68" cy="40" rx="12" ry="7" fill="#1c2430" opacity="0.22" />
      <path d="M44 40 H56" stroke="#e7d7a1" strokeWidth="1.2" />
      <path d="M40 8 L50 22 L60 8" fill="#fff6c2" opacity="0.35" />
      <path d="M76 24 l6 16" stroke="#e7d7a1" strokeWidth="1.3" strokeLinecap="round" />
      <circle data-flash cx="22" cy="18" r="1.1" fill="#fff6c2" />
      <circle data-flash cx="78" cy="14" r="1.1" fill="#fff6c2" />
    </>
  ),
  reggae: () => (
    <>
      <rect x="14" y="62" width="14" height="16" rx="2" fill="#2a3140" />
      <circle cx="21" cy="70" r="3.2" fill="#121820" />
      <circle cx="21" cy="70" r="1.2" fill="#d7dde6" />
      <circle cx="50" cy="12" r="7" fill="#ffe08a" opacity="0.4" />
      <ellipse cx="50" cy="16" rx="22" ry="5" fill="#f2c14e" />
      <path d="M30 16 H70" stroke="#fff6d8" strokeWidth="1.6" />
    </>
  ),
  soul: () => (
    <>
      <path d="M14 42 h10 v8 h-10 z M76 42 h10 v8 h-10 z" fill="#3a2a38" />
      <path d="M24 46 H76" stroke="#3a2a38" strokeWidth="1.6" />
      <ellipse data-flash cx="82" cy="24" rx="4" ry="6" fill="#ffb067" opacity="0.45" />
    </>
  ),
  country: () => (
    <>
      <ellipse cx="50" cy="14" rx="26" ry="5" fill="#8a5a2b" />
      <path d="M24 14 Q50 4 76 14 L74 18 Q50 12 26 18 Z" fill="#6d4520" />
      <rect x="74" y="62" width="12" height="8" rx="1" fill="#1a1024" stroke="#ff4fd8" strokeWidth="0.8" />
    </>
  ),
  jazz: () => (
    <>
      <path d="M18 38 Q32 32 44 38 Q32 44 18 38 Z" fill="#1c2430" opacity="0.28" />
      <path d="M56 38 Q68 32 82 38 Q68 44 56 38 Z" fill="#1c2430" opacity="0.28" />
      <ellipse cx="50" cy="18" rx="18" ry="6" fill="#6ea0ff" opacity="0.18" />
      <path d="M78 50 q8 14 2 24" fill="none" stroke="#d7c07a" strokeWidth="1.5" />
      <circle cx="80" cy="76" r="2.6" fill="none" stroke="#d7c07a" strokeWidth="1" />
    </>
  ),
  blues: () => (
    <>
      <path d="M76 56 v20" stroke="#c9843a" strokeWidth="1.3" />
      <ellipse cx="76" cy="78" rx="5" ry="3" fill="none" stroke="#c9843a" strokeWidth="1.1" />
      <rect x="16" y="66" width="16" height="5" rx="1" fill="#c7ccd4" />
      <path data-flash d="M24 64 q2 -4 0 -6" fill="none" stroke="#d7dde6" strokeWidth="0.8" />
    </>
  ),
  metal: () => (
    <>
      <path d="M22 20 H78" stroke="#b9bec8" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M30 20 l-1 -4 M42 20 l-1 -5 M54 20 l-1 -5 M66 20 l-1 -4" stroke="#eceff4" strokeWidth="1.2" />
      <path d="M74 28 l6 -8 l-2 8 l6 2 l-8 2 z" fill="#f2f4f8" />
    </>
  ),
  latin: () => (
    <>
      <circle cx="16" cy="28" r="3" fill="#f2c14e" />
      <path d="M16 31 v8" stroke="#c9843a" strokeWidth="1.2" />
      <circle cx="84" cy="30" r="3" fill="#f2c14e" />
      <path d="M84 33 v8" stroke="#c9843a" strokeWidth="1.2" />
      <path d="M70 58 q10 -16 6 -24" fill="none" stroke="#e7d7a1" strokeWidth="1.3" />
      <ellipse cx="76" cy="32" rx="3" ry="2" fill="none" stroke="#e7d7a1" strokeWidth="1" />
    </>
  ),
  punk: () => (
    <>
      <path d="M24 66 l6 3 -6 3" fill="none" stroke="#d7dde6" strokeWidth="1.2" />
      <circle cx="50" cy="16" r="16" fill="none" stroke="#c9cdd6" strokeWidth="1.4" />
      <circle cx="38" cy="10" r="1.1" fill="#f2f4f8" />
      <circle cx="50" cy="6" r="1.1" fill="#f2f4f8" />
      <circle cx="62" cy="10" r="1.1" fill="#f2f4f8" />
    </>
  ),
  indie: () => (
    <>
      <path d="M16 38 Q32 30 46 38 Q32 48 16 38 Z" fill="none" stroke="#d7dde6" strokeWidth="1.8" />
      <path d="M54 38 Q68 30 84 38 Q68 48 54 38 Z" fill="none" stroke="#d7dde6" strokeWidth="1.8" />
      <circle cx="78" cy="62" r="4" fill="#2f3d55" />
      <circle cx="78" cy="62" r="1.4" fill="#f2c14e" />
    </>
  ),
  emo: () => (
    <>
      <path d="M28 18 Q50 8 78 22" fill="none" stroke="#1a1020" strokeWidth="3" opacity="0.45" />
      <path d="M62 12 q12 2 8 14" fill="none" stroke="#d46bff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M18 64 c1.4 -3 4 -3 5.2 0 c1.4 -3 4 -3 5.2 0 c0 4 -5.2 6 -5.2 6 c0 0 -5.2 -2 -5.2 -6" fill="#1a1020" />
      <circle data-flash cx="30" cy="58" r="2.2" fill="#ff8fa3" />
      <circle data-flash cx="26" cy="52" r="0.7" fill="#d7e6ff" />
    </>
  ),
}
