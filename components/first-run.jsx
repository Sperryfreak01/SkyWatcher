// first-run.jsx — onboarding overlay for receiver URL + location
function FirstRun({ onComplete }) {
  const [url, setUrl] = React.useState('http://192.168.1.42:8080/data/aircraft.json');
  const [lat, setLat] = React.useState('37.7749');
  const [lon, setLon] = React.useState('-122.4194');
  const [elev, setElev] = React.useState('52');
  return (
    <div className="first-run">
      <div className="first-run-head">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
        </svg>
        <span className="serif" style={{ fontSize: 18 }}>Skywatcher</span>
        <span className="label" style={{ marginLeft: 'auto' }}>Setup · 1 of 1</span>
      </div>
      <div className="first-run-body">
        <div>
          <div className="label">Get started</div>
          <div className="fr-h serif">Point us<br/>at your sky.</div>
          <div className="fr-desc">Skywatcher talks to your local ADS-B receiver and tells you exactly where to look for the aircraft overhead. We need two things: where your receiver lives on your network, and where your house lives on the planet.</div>
          <div style={{ display: 'flex', gap: 20, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--mute)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span>◦ Works with dump1090 / tar1090</span>
            <span>◦ No cloud account needed</span>
          </div>
        </div>
        <div className="fr-form">
          <div className="fr-field mono">
            <label>
              <span className="label">Receiver endpoint</span>
              <input value={url} onChange={e => setUrl(e.target.value)} spellCheck={false} />
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: 10 }}>
            <div className="fr-field mono">
              <label><span className="label">Latitude</span><input value={lat} onChange={e => setLat(e.target.value)} /></label>
            </div>
            <div className="fr-field mono">
              <label><span className="label">Longitude</span><input value={lon} onChange={e => setLon(e.target.value)} /></label>
            </div>
            <div className="fr-field mono">
              <label><span className="label">Elev (m)</span><input value={elev} onChange={e => setElev(e.target.value)} /></label>
            </div>
          </div>
          <div className="fr-btns">
            <button className="btn primary" onClick={() => onComplete({ url, lat, lon, elev })}>Connect</button>
            <button className="btn" onClick={() => onComplete({ url, lat, lon, elev, demo: true })}>Use demo data</button>
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.06em', marginTop: 4 }}>
            Obstruction horizon is detected automatically from your receiver's visibility heatmap.
          </div>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { FirstRun });
