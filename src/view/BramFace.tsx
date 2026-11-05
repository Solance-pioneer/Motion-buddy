import { useLayoutEffect, useRef } from 'react'
import type { PoseHandles } from './applyPose.ts'

export function BramFace({ onReady }: { onReady: (handles: PoseHandles) => void }) {
  const rig = useRef<HTMLDivElement>(null)
  const shadow = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)

  useLayoutEffect(() => {
    const face = svg.current
    const rigNode = rig.current
    const shadowNode = shadow.current
    if (!face || !rigNode || !shadowNode) return
    const pick = (part: string) => {
      const node = face.querySelector(`[data-part="${part}"]`)
      if (!node) throw new Error(`Bram is missing ${part}`)
      return node
    }
    onReady({
      rig: rigNode,
      shadow: shadowNode,
      browL: pick('brow-l') as SVGPathElement,
      browR: pick('brow-r') as SVGPathElement,
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
      lashL: pick('lash-l') as SVGLineElement,
      lashR: pick('lash-r') as SVGLineElement,
      mouthOpen: pick('mouth-open') as SVGEllipseElement,
      mouthFrown: pick('mouth-frown') as SVGPathElement,
      cheekL: pick('cheek-l') as SVGEllipseElement,
      cheekR: pick('cheek-r') as SVGEllipseElement,
    })
  }, [onReady])

  return (
    <div className="character" data-testid="bram">
      <div className="shadow" ref={shadow} />
      <div className="rig" ref={rig}>
        <svg ref={svg} viewBox="0 0 260 330" role="img" aria-labelledby="bram-title" aria-describedby="bram-desc">
          <title id="bram-title">Bram</title>
          <desc id="bram-desc">
            A clay pocket lantern with a stem, two feet, and a face that shifts between curious and slightly grumpy.
          </desc>
          <defs>
            <linearGradient id="clay" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8f1e6" />
              <stop offset="48%" stopColor="#f3e4d2" />
              <stop offset="100%" stopColor="#e4cdb4" />
            </linearGradient>
            <linearGradient id="foot" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eddcc8" />
              <stop offset="100%" stopColor="#d9c2a8" />
            </linearGradient>
            <filter id="blush" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>

          <path d="M136 58c14-16 34-8 30 8-10 12-22 10-30-2-2-2-2-4 0-6z" fill="#7f947c" />
          <path d="M130 112 V48" fill="none" stroke="#667864" strokeWidth="7" strokeLinecap="round" />
          <circle cx="130" cy="42" r="8.5" fill="#8aa484" />

          <path
            d="M80 124h100c14 0 22 14 26 36l12 82c6 22-10 36-28 36H70c-18 0-34-14-28-36l12-82c4-22 12-36 26-36z"
            fill="url(#clay)"
          />
          <ellipse cx="88" cy="188" rx="16" ry="34" fill="#fffaf3" opacity="0.22" />
          <path d="M68 232c20 12 104 12 124 0" fill="none" stroke="#d9c2a8" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <ellipse cx="130" cy="248" rx="52" ry="14" fill="#ddc3a4" opacity="0.28" />
          <path
            d="M62 108c0-20 28-34 68-34s68 14 68 34v16c0 12-30 20-68 20s-68-8-68-20z"
            fill="#f6ecdf"
          />
          <path d="M78 122c0 8 24 12 52 12s52-4 52-12" fill="none" stroke="#e3d0ba" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="108" cy="286" rx="20" ry="11" fill="url(#foot)" />
          <ellipse cx="154" cy="286" rx="20" ry="11" fill="url(#foot)" />

          <ellipse data-part="cheek-l" cx="86" cy="196" rx="15" ry="8" fill="#e7b1a4" filter="url(#blush)" />
          <ellipse data-part="cheek-r" cx="174" cy="196" rx="15" ry="8" fill="#e7b1a4" filter="url(#blush)" />

          <g data-part="eye-l">
            <ellipse data-part="sclera-l" cx="98" cy="158" rx="22" ry="25" fill="#fbf6ef" stroke="#2c3834" strokeWidth="2.6" />
            <g data-part="look-l">
              <ellipse data-part="iris-l" cx="98" cy="159" rx="10" ry="12" fill="#4a645c" />
              <circle data-part="pupil-l" cx="98" cy="159" r="7" fill="#1a211f" />
              <circle data-part="spark-l" cx="95" cy="155" r="2.4" fill="#fffaf3" />
            </g>
          </g>
          <g data-part="eye-r">
            <ellipse data-part="sclera-r" cx="162" cy="158" rx="22" ry="25" fill="#fbf6ef" stroke="#2c3834" strokeWidth="2.6" />
            <g data-part="look-r">
              <ellipse data-part="iris-r" cx="162" cy="159" rx="10" ry="12" fill="#4a645c" />
              <circle data-part="pupil-r" cx="162" cy="159" r="7" fill="#1a211f" />
              <circle data-part="spark-r" cx="159" cy="155" r="2.4" fill="#fffaf3" />
            </g>
          </g>
          <line data-part="lash-l" x1="82" y1="158" x2="114" y2="158" stroke="#2c3834" strokeWidth="3" strokeLinecap="round" opacity="0" />
          <line data-part="lash-r" x1="146" y1="158" x2="178" y2="158" stroke="#2c3834" strokeWidth="3" strokeLinecap="round" opacity="0" />

          <path data-part="brow-l" d="M76 132 Q98 118 120 130" fill="none" stroke="#24302c" strokeWidth="6.5" strokeLinecap="round" />
          <path data-part="brow-r" d="M184 132 Q162 118 140 130" fill="none" stroke="#24302c" strokeWidth="6.5" strokeLinecap="round" />

          <ellipse data-part="mouth-open" cx="130" cy="198" rx="8.5" ry="10.5" fill="#24302c" />
          <path
            data-part="mouth-frown"
            d="M115 198 Q130 198 145 198"
            fill="none"
            stroke="#24302c"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0"
          />
        </svg>
      </div>
    </div>
  )
}
