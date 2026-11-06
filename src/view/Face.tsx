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
      eyeL: pick('eye-l') as SVGRectElement,
      eyeR: pick('eye-r') as SVGRectElement,
      mouthCurve: pick('mouth-curve') as SVGPathElement,
      mouthOpen: pick('mouth-open') as SVGEllipseElement,
    })
  }, [onReady])

  return (
    <svg ref={svgRef} className="face" viewBox="0 0 320 188" aria-hidden="true" data-testid="face">
      <g data-part="glance">
        <rect data-part="eye-l" x="22" y="42" width="128" height="72" rx="34" fill="#ffffff" stroke="none" />
        <rect data-part="eye-r" x="170" y="42" width="128" height="72" rx="34" fill="#ffffff" stroke="none" />
        <g data-part="mouth" transform="translate(160 154)">
          <path
            data-part="mouth-curve"
            d="M -22 0 Q 0 0 22 0"
            fill="none"
            stroke="#ffffff"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <ellipse data-part="mouth-open" cx="0" cy="0" rx="7" ry="7" fill="#ffffff" />
        </g>
      </g>
    </svg>
  )
}
