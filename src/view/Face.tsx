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
      softL: pick('soft-l') as SVGRectElement,
      softR: pick('soft-r') as SVGRectElement,
      tileL: pick('tile-l') as SVGRectElement,
      tileR: pick('tile-r') as SVGRectElement,
      mouthCurve: pick('mouth-curve') as SVGPathElement,
      mouthOpen: pick('mouth-open') as SVGEllipseElement,
    })
  }, [onReady])

  return (
    <svg ref={svgRef} className="face" viewBox="0 0 100 100" aria-hidden="true" data-testid="face">
      <g data-part="glance">
        <g data-part="eye-l">
          <rect data-part="soft-l" x="29" y="32" width="10" height="22" rx="5" fill="#ffffff" stroke="none" />
          <rect data-part="tile-l" x="29" y="32" width="10" height="22" rx="2.2" fill="#ffffff" stroke="none" visibility="hidden" />
        </g>
        <g data-part="eye-r">
          <rect data-part="soft-r" x="61" y="32" width="10" height="22" rx="5" fill="#ffffff" stroke="none" />
          <rect data-part="tile-r" x="61" y="32" width="10" height="22" rx="2.2" fill="#ffffff" stroke="none" visibility="hidden" />
        </g>
        <g data-part="mouth" transform="translate(50 64)">
          <path
            data-part="mouth-curve"
            d="M -3 0 Q 0 0 3 0"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <ellipse data-part="mouth-open" cx="0" cy="0" rx="1.5" ry="1.7" fill="#ffffff" />
        </g>
      </g>
    </svg>
  )
}
