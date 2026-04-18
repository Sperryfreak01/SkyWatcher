// panels.jsx — identity, route, transponder, history, status bar pieces

function LiveDot() { return <span className="live-dot" />; }

function StatusBar({ location = '37.7749° N, 122.4194° W', lastSeen = 'updated 0.3 s ago', theme, setTheme }) {
  return (
    <div className="statusbar">
      <div className="statusbar-brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
        </svg>
        <span className="name">Skywatcher</span>
      </div>
      <div className="statusbar-center">{location} · {lastSeen}</div>
      <div className="statusbar-right">
        <span className="poll-ring"><PollRing /> 10s</span>
        <span className="live-badge"><LiveDot /> LIVE</span>
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </div>
  );
}

function PollRing() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <circle cx="7" cy="7" r="5" fill="none" stroke="var(--line)" strokeWidth="1.25" />
      <circle cx="7" cy="7" r="5" fill="none" stroke="var(--pos)" strokeWidth="1.25"
        strokeDasharray="31.4" strokeDashoffset="7.85" strokeLinecap="round"
        transform="rotate(-90 7 7)">
        <animate attributeName="stroke-dashoffset" from="31.4" to="0" dur="10s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function ThemeToggle({ theme, setTheme }) {
  const opts = [
    { k: 'light', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg> },
    { k: 'auto', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18"/><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18" fill="currentColor"/></svg> },
    { k: 'dark',  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg> },
  ];
  return (
    <div className="theme-toggle">
      {opts.map(o => (
        <button key={o.k} className={theme === o.k ? 'active' : ''} onClick={() => setTheme(o.k)} aria-label={o.k} title={o.k}>
          {o.icon}
        </button>
      ))}
    </div>
  );
}

function BearingStrip({ az, el, dist, bearing }) {
  const compass = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const dir = compass[Math.round(az / 22.5) % 16];
  return (
    <div className="bearing-strip">
      <div className="stat lg">
        <span className="stat-k">Azimuth</span>
        <span className="stat-v accent mono">{Math.round(az)}<span className="unit">°</span></span>
        <span className="stat-sub">{dir} · bearing {Math.round(bearing)}°</span>
      </div>
      <div className="stat lg">
        <span className="stat-k">Elevation</span>
        <span className="stat-v accent mono">{Math.round(el)}<span className="unit">°</span></span>
        <span className="stat-sub">up from horizon</span>
      </div>
      <div className="stat lg">
        <span className="stat-k">Distance</span>
        <span className="stat-v mono">{dist.toFixed(1)}<span className="unit"> nm</span></span>
        <span className="stat-sub">slant · {(dist * 1.852).toFixed(1)} km</span>
      </div>
    </div>
  );
}

function IdentityHead({ ac }) {
  return (
    <div className="identity-head">
      <div>
        <div className="label">Callsign</div>
        <div className="cs">{ac.callsign}</div>
        <div className="meta">{ac.operator} · {ac.type}</div>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <span className="tag">{ac.status}</span>
        <span className="icao">ICAO {ac.icao} · {ac.reg}</span>
      </div>
    </div>
  );
}

function Photo() {
  return (
    <div className="photo">
      <svg viewBox="0 0 100 60" fill="none" stroke="var(--ink)" strokeWidth="0.4" preserveAspectRatio="xMidYMid meet">
        <path d="M50 12 L52 28 L78 34 L80 37 L52 32 L50 48 L54 50 L54 52 L46 52 L46 50 L50 48 L48 32 L20 37 L22 34 L48 28 L50 12 Z" fill="var(--ink)" opacity="0.5"/>
      </svg>
      <div className="caption">Photo · planespotters.net</div>
    </div>
  );
}

function RouteCard({ ac }) {
  const pct = ac.progress * 100;
  return (
    <div className="route-card">
      <div className="route-head">
        <div>
          <div className="route-code">{ac.from}</div>
          <div className="route-sub">{ac.fromCity}</div>
          <div className="route-sub mono" style={{ marginTop: 2 }}>DEP {ac.depTime}</div>
        </div>
        <RouteTrack progress={ac.progress} />
        <div style={{ textAlign: 'right' }}>
          <div className="route-code">{ac.to}</div>
          <div className="route-sub">{ac.toCity}</div>
          <div className="route-sub mono" style={{ marginTop: 2 }}>ETA {ac.etaTime}</div>
        </div>
      </div>
      <div className="route-meta">{Math.round(pct)}% complete · {ac.eta}</div>
    </div>
  );
}

function RouteTrack({ progress }) {
  const W = 100; // percent
  return (
    <div className="route-track">
      <svg viewBox="0 0 200 24" width="100%" height="24" preserveAspectRatio="none">
        <path d="M 4 18 Q 100 -4 196 18" fill="none" stroke="var(--line)" strokeWidth="1" strokeDasharray="2 3" />
        <path d="M 4 18 Q 100 -4 196 18" fill="none" stroke="var(--acc)" strokeWidth="1.25"
          strokeDasharray={`${progress * 200} 200`}
          style={{ transition: 'stroke-dasharray 1s var(--ease-out)' }} />
        <circle cx="4" cy="18" r="3" fill="var(--ink)" />
        <circle cx="196" cy="18" r="3" fill="var(--ink)" />
        {(() => {
          // point along quadratic bezier at t = progress
          const t = progress;
          const x = (1 - t) * (1 - t) * 4 + 2 * (1 - t) * t * 100 + t * t * 196;
          const y = (1 - t) * (1 - t) * 18 + 2 * (1 - t) * t * -4 + t * t * 18;
          return (
            <g style={{ transition: 'transform 1s var(--ease-out)' }} transform={`translate(${x},${y})`}>
              <circle r="5" fill="var(--acc)" opacity="0.25" />
              <circle r="2.5" fill="var(--acc)" />
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

function TransponderGrid({ ac, density = 'full' }) {
  const full = density === 'full';
  return (
    <div className="grid-rows">
      <Row k="Altitude" v={ac.alt.toLocaleString()} u="ft" accent />
      <Row k="Speed" v={Math.round(ac.spd)} u="kts" />
      <Row k="Heading" v={`${Math.round(ac.hdg)}°`} />
      <Row k="Vert rate" v={ac.vrate >= 0 ? `+${ac.vrate}` : ac.vrate} u="fpm" />
      <Row k="Squawk" v={ac.sqk} />
      <Row k="ICAO" v={ac.icao} />
      {full && <>
        <Row k="Mach" v={ac.mach.toFixed(2)} />
        <Row k="Track" v={`${Math.round(ac.hdg) + 1}°`} />
        <Row k="Latitude" v={ac.lat.toFixed(4) + '°'} />
        <Row k="Longitude" v={ac.lon.toFixed(4) + '°'} />
        <Row k="RSSI" v="-8.2" u="dB" />
        <Row k="Last seen" v="0.3" u="s" />
      </>}
    </div>
  );
}
function Row({ k, v, u, accent }) {
  return (
    <div className="row">
      <span className="row-k">{k}</span>
      <span className={`row-v ${accent ? 'accent' : ''}`}>{v}{u && <span className="u">{u}</span>}</span>
    </div>
  );
}

function History({ items, activeId, onPick }) {
  return (
    <div className="history no-sb">
      {items.map(it => (
        <div key={it.id} className={`hist-card ${it.id === activeId ? 'active' : ''}`} onClick={() => onPick(it.id)}>
          <span className="cs">{it.callsign}</span>
          <span className="r">{it.from} → {it.to}</span>
          <span className="w">{it.when}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  StatusBar, BearingStrip, IdentityHead, Photo, RouteCard, TransponderGrid, History, LiveDot,
});
