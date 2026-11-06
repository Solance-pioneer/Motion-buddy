import { useEffect, useRef, useState } from 'react'
import type { Candidate } from '../logic/catalog.ts'
import type { Decision } from '../logic/review.ts'

export function ReviewDeck({
  candidate,
  index,
  total,
  kept,
  rejected,
  filter,
  overview,
  decision,
  motionLabel,
  onKeep,
  onReject,
  onUndo,
  onReplay,
  onFilter,
  onJump,
  onOverview,
  onCompanion,
  onExport,
  onImport,
  items,
}: {
  candidate: Candidate
  index: number
  total: number
  kept: number
  rejected: number
  filter: 'all' | 'keep' | 'reject' | 'unreviewed'
  overview: boolean
  decision: Decision | 'unreviewed'
  motionLabel: boolean
  onKeep: () => void
  onReject: () => void
  onUndo: () => void
  onReplay: () => void
  onFilter: (filter: 'all' | 'keep' | 'reject' | 'unreviewed') => void
  onJump: (index: number) => void
  onOverview: (open: boolean) => void
  onCompanion: () => void
  onExport: () => void
  onImport: (file: File) => void
  items: Array<{ id: string; name: string; decision: Decision | 'unreviewed' }>
}) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const [drag, setDrag] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') onKeep()
      else if (event.key === 'ArrowLeft') onReject()
      else if (event.key === 'u' || event.key === 'U') onUndo()
      else if (event.key === 'r' || event.key === 'R') onReplay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onKeep, onReject, onReplay, onUndo])

  return (
    <section className="review" data-stage="review" data-review-index={index} data-review-decision={decision} aria-label="Face audition">
      <div className="review-top">
        <p className="review-progress">
          {index + 1} of {total} · {kept} kept · {rejected} rejected
        </p>
        <p className="review-save">Choices are saved on this device unless you export them.</p>
      </div>
      <div
        className="review-stage"
        data-testid="review-stage"
        style={{ transform: `translateX(${drag}px) rotate(${drag / 40}deg)` }}
        onPointerDown={(event) => {
          start.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerMove={(event) => {
          if (!start.current) return
          setDrag(event.clientX - start.current.x)
        }}
        onPointerUp={(event) => {
          if (!start.current) return
          const dx = event.clientX - start.current.x
          start.current = null
          setDrag(0)
          if (dx > 90) onKeep()
          else if (dx < -90) onReject()
        }}
        onPointerCancel={() => {
          start.current = null
          setDrag(0)
        }}
      >
        <p className="review-name">{candidate.name}</p>
        <p className="review-kind">{candidate.kind === 'action' ? 'Short action' : 'Expression'}</p>
        {motionLabel ? <p className="review-sim">Simulated movement</p> : null}
      </div>
      <div className="review-actions">
        <button type="button" className="review-reject" onClick={onReject}>
          Reject
        </button>
        <button type="button" onClick={onReplay}>
          Replay
        </button>
        <button type="button" className="review-keep" onClick={onKeep}>
          Keep
        </button>
      </div>
      <div className="review-secondary">
        <button type="button" onClick={onUndo}>
          Undo
        </button>
        <button type="button" onClick={onCompanion}>
          Try my companion
        </button>
        <button type="button" onClick={() => onOverview(!overview)}>
          Overview
        </button>
      </div>
      <div className="review-filters" role="group" aria-label="Filter candidates">
        {(['all', 'unreviewed', 'keep', 'reject'] as const).map((item) => (
          <button key={item} type="button" aria-pressed={filter === item} onClick={() => onFilter(item)}>
            {item === 'keep' ? 'Kept' : item === 'reject' ? 'Rejected' : item === 'unreviewed' ? 'Unreviewed' : 'All'}
          </button>
        ))}
      </div>
      <div className="review-transfer">
        <button type="button" onClick={onExport}>
          Export review
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}>
          Import review
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onImport(file)
            event.target.value = ''
          }}
        />
      </div>
      <p className="review-keys">Right arrow keeps. Left arrow rejects. U undoes. R replays.</p>
      {overview ? (
        <ul className="review-overview">
          {items.map((item, itemIndex) => (
            <li key={item.id}>
              <button type="button" onClick={() => onJump(itemIndex)} data-decision={item.decision}>
                {item.name} · {item.decision}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
