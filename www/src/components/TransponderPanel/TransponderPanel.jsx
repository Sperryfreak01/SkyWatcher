import { useContext } from 'react'
import { AircraftContext } from '../../contexts/AircraftContext'
import { fmtDist, fmtSpeed, fmtAlt } from '../../lib/units'

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

function formatVRate(baro_rate) {
  if (baro_rate == null) return '—'
  const n = Math.round(baro_rate)
  if (n > 0) return `+${n}`
  return String(n)
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
    az, el, distance3d,
  } = currentAircraft

  const dir = compassDir(az)

  return (
    <div>
      <div className="label" style={{ marginBottom: 6 }}>Transponder · live ADS-B</div>
      <div className="grid-rows">
        <Row label="Altitude" value={fmtAlt(alt_baro)} accent />
        <Row label="Ground speed" value={fmtSpeed(gs)} />
        <Row label="Heading" value={track != null ? `${Math.round(track)}°` : '—'} />
        <Row label="Vertical rate" value={formatVRate(baro_rate)} unit="fpm" title="Vertical rate: rate of climb or descent in feet per minute" />
        <Row label="Squawk" value={squawk || '—'} title="Squawk code: 4-digit octal code assigned by ATC to identify this aircraft on radar" />
        <Row label="ICAO" value={hex?.toUpperCase() || '—'} title="ICAO 24-bit hex address: unique identifier assigned to this aircraft" />
        <Row label="Distance" value={fmtDist(distance3d)} />
        <Row label="Azimuth" value={az != null ? `${Math.round(az)}°` : '—'} title="Azimuth: compass direction to the aircraft (0°=North, 90°=East, 180°=South)" />
        <Row label="Elevation" value={el != null ? `${Math.round(el)}°` : '—'} />
        {dir && <Row label="Direction" value={dir} />}
      </div>
    </div>
  )
}
