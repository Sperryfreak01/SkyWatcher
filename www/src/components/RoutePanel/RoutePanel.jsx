import { useContext } from 'react'
import { AircraftContext } from '../../contexts/AircraftContext'

function RouteTrack({ progress }) {
  const t = Math.max(0, Math.min(1, progress))
  // Quadratic bezier: from (4,18) through (100,-4) to (196,18)
  const bx = (1 - t) * (1 - t) * 4 + 2 * (1 - t) * t * 100 + t * t * 196
  const by = (1 - t) * (1 - t) * 18 + 2 * (1 - t) * t * -4 + t * t * 18

  return (
    <div className="route-track">
      <svg viewBox="0 0 200 24" width="100%" height="24" preserveAspectRatio="none">
        <path
          d="M 4 18 Q 100 -4 196 18"
          fill="none"
          stroke="var(--line)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <path
          d="M 4 18 Q 100 -4 196 18"
          fill="none"
          stroke="var(--acc)"
          strokeWidth="1.25"
          strokeDasharray={`${t * 200} 200`}
          style={{ transition: 'stroke-dasharray 1s var(--ease-out)' }}
        />
        <circle cx="4" cy="18" r="3" fill="var(--ink)" />
        <circle cx="196" cy="18" r="3" fill="var(--ink)" />
        <g
          style={{ transition: 'transform 1s var(--ease-out)' }}
          transform={`translate(${bx},${by})`}
        >
          <circle r="5" fill="var(--acc)" opacity="0.25" />
          <circle r="2.5" fill="var(--acc)" />
        </g>
      </svg>
    </div>
  )
}

function StatusBadge({ status }) {
  if (!status) return null
  const normalized = status.toUpperCase()
  const color = normalized === 'IN_FLIGHT' || normalized === 'IN FLIGHT'
    ? 'var(--pos)'
    : normalized === 'CANCELLED' || normalized === 'DELAYED'
    ? 'var(--warn)'
    : 'var(--mute)'
  const label = normalized.replace('_', ' ')
  return (
    <span
      style={{
        padding: '2px 7px',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: 'var(--surface)',
        background: color,
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  )
}

export default function RoutePanel() {
  const { currentAircraft, enrichment } = useContext(AircraftContext)

  if (!currentAircraft) {
    return (
      <div className="route-card" style={{ textAlign: 'center' }}>
        <div className="label" style={{ marginBottom: 4 }}>Route</div>
        <div style={{ fontSize: 13, color: 'var(--mute)' }}>No flight data</div>
      </div>
    )
  }

  const { origin, destination, status, progress_percent } = enrichment ?? {}

  if (!origin && !destination) {
    return (
      <div className="route-card">
        <div className="label" style={{ marginBottom: 4 }}>Route</div>
        <div style={{ fontSize: 13, color: 'var(--mute)' }}>Route data not available</div>
      </div>
    )
  }

  const progress = progress_percent != null ? progress_percent / 100 : 0

  return (
    <div className="route-card">
      <div className="route-head">
        <div>
          <div className="route-code">{origin || '----'}</div>
        </div>
        <RouteTrack progress={progress} />
        <div style={{ textAlign: 'right' }}>
          <div className="route-code">{destination || '----'}</div>
        </div>
      </div>

      <div className="route-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{Math.round(progress * 100)}% complete</span>
        {status && <StatusBadge status={status} />}
      </div>
    </div>
  )
}
