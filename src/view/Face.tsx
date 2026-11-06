import { useLayoutEffect, useRef } from 'react'
import type { FaceHandles } from './applyPose.ts'

export function Face({ onReady }: { onReady: (handles: FaceHandles) => void }) {
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
      <g data-part="glance">
        <g data-part="eye-l" fill="#ffffff" stroke="none"><path data-part="eye-l-path" /></g>
        <g data-part="eye-r" fill="#ffffff" stroke="none"><path data-part="eye-r-path" /></g>
        <path data-part="mouth" fill="#ffffff" stroke="none" />
        <ellipse data-part="blush-l" cx="22" cy="58" rx="4.2" ry="2.2" fill="#ff8fa3" opacity="0" />
        <ellipse data-part="blush-r" cx="78" cy="58" rx="4.2" ry="2.2" fill="#ff8fa3" opacity="0" />
        <path data-part="sweat" d="M74 30 q2 4 0 6 q-2-2 0-6z" fill="#ffffff" opacity="0" />
        <path data-part="anger" d="M24 24 l5 4 M76 24 l-5 4" fill="none" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0" />
        <g data-part="speed" opacity="0">
          <path d="M84 32 h8 M86 40 h6 M84 48 h8" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  )
}
