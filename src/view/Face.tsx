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
      eyeL: pick('eye-l') as SVGGElement,
      eyeR: pick('eye-r') as SVGGElement,
      scleraL: pick('sclera-l') as SVGEllipseElement,
      scleraR: pick('sclera-r') as SVGEllipseElement,
      irisL: pick('iris-l') as SVGEllipseElement,
      irisR: pick('iris-r') as SVGEllipseElement,
      pupilL: pick('pupil-l') as SVGCircleElement,
      pupilR: pick('pupil-r') as SVGCircleElement,
      sparkL: pick('spark-l') as SVGCircleElement,
      sparkR: pick('spark-r') as SVGCircleElement,
      lookL: pick('look-l') as SVGGElement,
      lookR: pick('look-r') as SVGGElement,
      mouthCurve: pick('mouth-curve') as SVGPathElement,
      mouthOpen: pick('mouth-open') as SVGEllipseElement,
    })
  }, [onReady])

  return (
    <svg
      ref={svgRef}
      className="face"
      viewBox="0 0 280 230"
      aria-hidden="true"
      data-testid="face"
    >
      <g data-part="eye-l">
        <ellipse data-part="sclera-l" cx="88" cy="98" rx="46" ry="58" fill="#fbf8f3" stroke="#24312e" strokeWidth="3.5" />
        <g data-part="look-l">
          <ellipse data-part="iris-l" cx="88" cy="100" rx="15" ry="18" fill="#3f6f62" />
          <circle data-part="pupil-l" cx="88" cy="100" r="7.4" fill="#1c2824" />
          <circle data-part="spark-l" cx="82" cy="90" r="3.1" fill="#fffaf4" />
        </g>
      </g>
      <g data-part="eye-r">
        <ellipse data-part="sclera-r" cx="192" cy="98" rx="46" ry="58" fill="#fbf8f3" stroke="#24312e" strokeWidth="3.5" />
        <g data-part="look-r">
          <ellipse data-part="iris-r" cx="192" cy="100" rx="15" ry="18" fill="#3f6f62" />
          <circle data-part="pupil-r" cx="192" cy="100" r="7.4" fill="#1c2824" />
          <circle data-part="spark-r" cx="186" cy="90" r="3.1" fill="#fffaf4" />
        </g>
      </g>
      <g data-part="mouth" transform="translate(140 188)">
        <path data-part="mouth-curve" d="M -60 0 Q 0 2.4 60 0" fill="none" stroke="#24312e" strokeWidth="7" strokeLinecap="round" />
        <ellipse data-part="mouth-open" cx="0" cy="6" rx="16" ry="14" fill="#24312e" />
      </g>
    </svg>
  )
}
