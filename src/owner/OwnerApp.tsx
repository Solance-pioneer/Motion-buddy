import { useCallback, useEffect, useRef, useState } from 'react'
import { CANDIDATES, FrameBlend, sampleAudition, sampleCandidate } from '../logic/catalog.ts'
import { companionBeats, sampleBeats } from '../logic/playlist.ts'
import { isExpression } from '../logic/catalog.ts'
import {
  counts,
  keptIds,
  loadReview,
  parseReview,
  saveReview,
  type Decision,
  type ReviewFile,
} from '../logic/review.ts'
import { applyPose, type FaceHandles } from '../view/applyPose.ts'
import { Face } from '../view/Face.tsx'
import { ReviewDeck } from '../view/ReviewDeck.tsx'

export function OwnerApp() {
  const [review, setReview] = useState<ReviewFile>(() => loadReview())
  const [filter, setFilter] = useState<'all' | 'keep' | 'reject' | 'unreviewed'>('all')
  const [overview, setOverview] = useState(false)
  const [preview, setPreview] = useState(false)
  const [notice, setNotice] = useState('')
  const handles = useRef<FaceHandles | null>(null)
  const blend = useRef(new FrameBlend())
  const clock = useRef(0)
  const undo = useRef<ReviewFile[]>([])
  const gaze = useRef(0)
  const gazeUntil = useRef(0)
  const reviewRef = useRef(review)
  reviewRef.current = review

  const pool = CANDIDATES.filter((item) => {
    const decision = review.decisions[item.id]
    if (filter === 'keep') return decision === 'keep'
    if (filter === 'reject') return decision === 'reject'
    if (filter === 'unreviewed') return decision !== 'keep' && decision !== 'reject'
    return true
  })
  const index = pool.length === 0 ? 0 : Math.min(review.index, pool.length - 1)
  const candidate = pool[index] ?? CANDIDATES[0]
  const tally = counts(review)
  const kept = keptIds(review)

  const persist = useCallback((next: ReviewFile) => {
    setReview(next)
    saveReview(next)
  }, [])

  const decide = useCallback(
    (decision: Decision) => {
      if (!candidate || preview) return
      undo.current.push(review)
      clock.current = 0
      persist({
        ...review,
        decisions: { ...review.decisions, [candidate.id]: decision },
        index: pool.length <= 1 ? 0 : (index + 1) % pool.length,
      })
    },
    [candidate, index, persist, pool.length, preview, review],
  )

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(80, now - last)
      last = now
      clock.current += dt
      const current = reviewRef.current
      const keptNow = keptIds(current)
      const beats = companionBeats(keptNow, 'desk')
      const beat = sampleBeats(beats, clock.current)
      const id = preview ? beat?.id ?? 'neutral' : candidate?.id ?? 'curious'
      const played = preview
        ? sampleCandidate(id, clock.current, false, 'soft')
        : sampleAudition(id, clock.current, false, 'soft')
      if (performance.now() < gazeUntil.current) played.gazeX = gaze.current
      const features = blend.current.sample(id + (preview ? ':preview' : ''), played.features, false, dt)
      if (handles.current) applyPose(handles.current, features, played.blink, '#ffffff', played.gazeX, played.gazeY)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [candidate?.id, preview])

  const fileName = candidate?.name ?? 'Face'
  return (
    <main className="owner" data-stage={preview ? 'owner-preview' : 'owner-review'} data-candidate={candidate?.id ?? ''}>
      <p className="owner-banner">
        Owner audition. This is not the customer app and it is not a private website. Choices stay in this browser until you export them.
        Opening this file on a phone does not grant motion sensors. Simulated movement works here. Real iPhone motion needs a secure page, which this file is not.
      </p>
      <div className="owner-face">
        <Face onReady={(next) => { handles.current = next }} />
      </div>
      {preview ? (
        <section className="review" aria-label="Approved companion preview">
          <p className="review-name">Approved companion preview</p>
          <p className="review-save">
            {kept.filter(isExpression).length === 0
              ? 'Nothing is kept yet. Unreviewed and rejected faces stay out. Go back and keep at least one expression.'
              : `Playing ${kept.filter(isExpression).length} kept expressions. This preview is not the customer default.`}
          </p>
          <div className="review-actions">
            <button
              type="button"
              onClick={() => {
                gaze.current = -1
                gazeUntil.current = performance.now() + 1200
              }}
            >
              Simulated left
            </button>
            <button
              type="button"
              onClick={() => {
                gaze.current = 1
                gazeUntil.current = performance.now() + 1200
              }}
            >
              Simulated right
            </button>
          </div>
          <p className="review-sim">Simulated sensor input. Not a live phone reading.</p>
          <button type="button" className="review-keep" onClick={() => setPreview(false)}>
            Back to audition
          </button>
        </section>
      ) : candidate ? (
        <ReviewDeck
          candidate={candidate}
          index={index}
          total={pool.length}
          kept={tally.kept}
          rejected={tally.rejected}
          filter={filter}
          overview={overview}
          decision={review.decisions[candidate.id] ?? 'unreviewed'}
          motionLabel={candidate.motion}
          items={pool.map((item) => ({ id: item.id, name: item.name, decision: review.decisions[item.id] ?? 'unreviewed' }))}
          onKeep={() => decide('keep')}
          onReject={() => decide('reject')}
          onUndo={() => {
            const previous = undo.current.pop()
            if (previous) persist(previous)
          }}
          onReplay={() => {
            clock.current = 0
          }}
          onFilter={(next) => {
            setFilter(next)
            persist({ ...review, index: 0 })
          }}
          onJump={(next) => persist({ ...review, index: next })}
          onOverview={setOverview}
          onCompanion={() => {
            clock.current = 0
            setPreview(true)
          }}
          onExport={() => {
            const blob = new Blob([JSON.stringify(review, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = 'motion-buddy-review.json'
            link.click()
            URL.revokeObjectURL(url)
          }}
          onImport={(file) => {
            void file.text().then((raw) => {
              const parsed = parseReview(raw)
              if (!parsed) {
                setNotice('That file is not a Motion Buddy review.')
                return
              }
              undo.current.push(review)
              persist(parsed)
              setNotice('')
            })
          }}
        />
      ) : null}
      {notice ? <p className="review-sim">{notice}</p> : null}
      <p className="sr-only">Now showing {fileName}</p>
    </main>
  )
}
