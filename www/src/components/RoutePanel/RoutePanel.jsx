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

function airportCode(v) {
  if (!v) return null
  if (typeof v === 'string') return v
  return v.code_iata || v.code_icao || v.code || null
}

function airportCity(v) {
  if (!v || typeof v === 'string') return null
  return v.city || v.name || null
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

  const { origin: rawOrigin, destination: rawDest, progress_percent } = enrichment ?? {}
  const origin = airportCode(rawOrigin)
  const destination = airportCode(rawDest)
  const originCity = airportCity(rawOrigin)
  const destCity = airportCity(rawDest)

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
          {originCity && <div className="route-sub">{originCity}</div>}
        </div>
        <RouteTrack progress={progress} />
        <div style={{ textAlign: 'right' }}>
          <div className="route-code">{destination || '----'}</div>
          {destCity && <div className="route-sub">{destCity}</div>}
        </div>
      </div>

      <div className="route-meta">
        {Math.round(progress * 100)}% complete
      </div>
    </div>
  )
}
