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
}
