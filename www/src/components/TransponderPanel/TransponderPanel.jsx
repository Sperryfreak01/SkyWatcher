import { useContext } from 'react'
import { AircraftContext } from '../../contexts/AircraftContext'

function Row({ label, value, unit, accent, title }) {
  return (
    <div className="row">
      <span className="row-k" title={title}>{label}</span>
      <span className={`row-v${accent ? ' accent' : ''}`}>
        {value}
        {unit && <span className="u">{unit}</span>}
      </span>
    </div>
  )
}

function formatAlt(alt) {
  if (alt == null || alt === 'ground') return 'GND'
  const n = typeof alt === 'string' ? parseInt(alt, 10) : alt
  if (isNaN(n)) return '—'
  return n.toLocaleString()
}

function formatVRate(baro_rate) {
  if (baro_rate == null) return '—'
  const n = Math.round(baro_rate)
  if (n > 0) return `+${n}`
  return String(n)
}

function formatDistance(distance3d) {
  if (distance3d == null) return '—'
  // distance3d is in metres
  if (distance3d >= 10000) {
    return { value: (distance3d / 1000).toFixed(1), unit: 'km' }
  }
  return { value: Math.round(distance3d).toLocaleString(), unit: 'm' }
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

function compassDir(az) {
  if (az == null) return ''
  return COMPASS[Math.round(az / 22.5) % 16]
}

export default function TransponderPanel() {
  const { currentAircraft } = useContext(AircraftContext)

  if (!currentAircraft) {
    return (
      <div>
        <div className="label" style={{ marginBottom: 6 }}>Transponder · live ADS-B</div>
        <div className="grid-rows">
          <div style={{ fontSize: 13, color: 'var(--mute)', padding: '8px 0' }}>No data</div>
        </div>
      </div>
    )
  }

  const {
    alt_baro, gs, track, baro_rate, squawk, hex,
    az, el, distance3d, distanceGround,
  } = currentAircraft

  const dist = formatDistance(distance3d)
  const dir = compassDir(az)

  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>Transponder · live ADS-B</div>
      <div className="grid-rows">
        <Row label="Altitude" value={formatAlt(alt_baro)} unit="ft" accent />
        <Row label="Ground speed" value={gs != null ? Math.round(gs) : '—'} unit="kts" />
        <Row label="Heading" value={track != null ? `${Math.round(track)}°` : '—'} />
        <Row label="Vertical rate" value={formatVRate(baro_rate)} unit="fpm" title="Vertical rate: rate of climb or descent in feet per minute" />
        <Row label="Squawk" value={squawk || '—'} title="Squawk code: 4-digit octal code assigned by ATC to identify this aircraft on radar" />
        <Row label="ICAO" value={hex?.toUpperCase() || '—'} title="ICAO 24-bit hex address: unique identifier assigned to this aircraft" />
        <Row
          label="Distance"
          value={dist === '—' ? '—' : dist.value}
          unit={dist === '—' ? undefined : dist.unit}
        />
        <Row label="Azimuth" value={az != null ? `${Math.round(az)}°` : '—'} title="Azimuth: compass direction to the aircraft (0°=North, 90°=East, 180°=South)" />
        <Row label="Elevation" value={el != null ? `${Math.round(el)}°` : '—'} />
        {dir && <Row label="Direction" value={dir} />}
      </div>
    </div>
  )
}
