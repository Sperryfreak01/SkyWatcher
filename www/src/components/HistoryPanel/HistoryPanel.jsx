import { useContext } from 'react'
import { AircraftContext } from '../../contexts/AircraftContext'

/**
 * Each history item may have these fields (populated by feat/history):
 *   hex, flight (callsign), aircraft_type, operator, origin, destination,
 *   seenAt (timestamp ms), alt_baro
 *
 * Defensive rendering: render whatever fields exist.
 */

function formatAge(ts) {
  if (!ts) return ''
  const secs = Math.round((Date.now() - ts) / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.round(mins / 60)}h ago`
}

function HistCard({ item, isActive }) {
  const callsign = item.flight?.trim() || item.hex || '???'
  const route = item.origin && item.destination
    ? `${item.origin} → ${item.destination}`
    : item.aircraft_type || item.operator || ''
  const when = item.seenAt ? formatAge(item.seenAt) : (item.when || '')

  return (
    <div className={`hist-card${isActive ? ' active' : ''}`}>
      <span className="cs">{callsign}</span>
      {route && <span className="r">{route}</span>}
      {when && <span className="w">{when}</span>}
    </div>
  )
}

export default function HistoryPanel() {
  const { history, currentAircraft } = useContext(AircraftContext)

  if (!history || history.length === 0) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="label">Recent overhead</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--mute)' }}>0 flights</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--mute)' }}>No history yet</div>
      </div>
    )
  }

  // Desktop shows 7, phone shows 5 via CSS (.hist-card:nth-child(n+6))
  const items = history.slice(0, 7)
  const activeHex = currentAircraft?.hex

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="label">Recent overhead</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--mute)' }}>{history.length} flights</div>
      </div>
      <div className="history no-sb">
        {items.map((item, i) => (
          <HistCard
            key={item.hex || item.id || i}
            item={item}
            isActive={item.hex === activeHex}
          />
        ))}
      </div>
    </div>
  )
}
