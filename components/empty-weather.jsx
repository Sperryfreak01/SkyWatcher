// empty-weather.jsx — Instrument-style weather fallback
function EmptyWeather({ lastCallsign = 'SWA1132', lastSeen = '14 min ago' }) {
  return (
    <div className="empty-wrap">
      <div className="empty-hero">
        <div className="label">No aircraft visible</div>
        <div className="h serif">Quiet skies overhead.</div>
        <div className="p">Checking your receiver every 10 seconds. Here's what's happening outside.</div>
      </div>
      <div className="weather-grid">
        <WxTile k="Temperature" v="62" u="°F" sub="feels like 59°" />
        <WxTile k="Sky" v="Clear" sub="0% cloud cover" accent />
        <WxTile k="Wind" v="8" u="kts" sub="from the west" />
        <WxTile k="Visibility" v="10" u="mi" sub="unlimited" />
        <WxTile k="Dew point" v="54" u="°F" sub="comfortable" />
        <WxTile k="Pressure" v="30.12" u="inHg" sub="steady" />
        <WxTile k="Sunset" v="6:42" u="pm" sub="in 2h 18m" />
        <WxTile k="Moon" v="64%" sub="waxing gibbous" />
      </div>
      <div className="empty-footer">
        <div>
          <div className="label">Last aircraft seen</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{lastCallsign} <span style={{ color: 'var(--mute)', fontWeight: 400, fontSize: 12 }}>· {lastSeen}</span></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div className="label">Receiver</div>
          <div className="mono" style={{ fontSize: 12 }}>192.168.1.42:8080 <span style={{ color: 'var(--pos)' }}>● ok</span></div>
        </div>
      </div>
    </div>
  );
}
function WxTile({ k, v, u, sub, accent }) {
  return (
    <div className="weather-tile">
      <div className="label" style={{ marginBottom: 8 }}>{k}</div>
      <div className="mono" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em', color: accent ? 'var(--acc)' : 'var(--ink)', lineHeight: 1 }}>
        {v}{u && <span style={{ fontSize: 13, color: 'var(--mute)', fontWeight: 500, marginLeft: 3 }}>{u}</span>}
      </div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.04em', marginTop: 6 }}>{sub}</div>
    </div>
  );
}

Object.assign(window, { EmptyWeather });
