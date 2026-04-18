// HiFiBits.jsx — shared hi-fi primitives: stats, rows, photo, route, history, status bar

// ───────── Status bar ─────────
function HFStatusBar({ sub = 'BERKELEY · 37.87°N 122.27°W', mode = 'LIVE', refresh = 7 }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px',
      borderBottom: '1px solid var(--line)',
      background: 'var(--surface)',
      gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <HFLogo />
        <div className="display" style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2 }}>skywatcher</div>
      </div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {sub}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.08em' }}>
          NEXT POLL {refresh}s
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" />
          <span className="mono" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--pos)' }}>{mode}</span>
        </div>
      </div>
    </div>
  );
}

function HFLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <circle cx="10" cy="10" r="4.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <circle cx="10" cy="10" r="1.2" fill="var(--acc)" />
      <line x1="10" y1="0.5" x2="10" y2="4" stroke="currentColor" strokeWidth="0.8" />
      <line x1="10" y1="16" x2="10" y2="19.5" stroke="currentColor" strokeWidth="0.8" />
      <line x1="0.5" y1="10" x2="4" y2="10" stroke="currentColor" strokeWidth="0.8" />
      <line x1="16" y1="10" x2="19.5" y2="10" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

// ───────── Big numeric stat ─────────
function HFStat({ k, v, unit, sub, size = 'md', accent, style = {} }) {
  const sizes = {
    sm: { v: 18, k: 9 },
    md: { v: 28, k: 10 },
    lg: { v: 40, k: 11 },
  };
  const s = sizes[size];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, ...style }}>
      <div className="label" style={{ fontSize: s.k }}>{k}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="mono" style={{
          fontSize: s.v, fontWeight: 600, lineHeight: 1,
          color: accent ? 'var(--acc)' : 'var(--ink)',
          letterSpacing: '-0.02em',
        }}>{v}</span>
        {unit && <span className="mono" style={{ fontSize: s.v * 0.4, color: 'var(--mute)' }}>{unit}</span>}
      </div>
      {sub && <div className="mono" style={{ fontSize: 10, color: 'var(--mute)' }}>{sub}</div>}
    </div>
  );
}

// ───────── Data row ─────────
function HFRow({ k, v, unit, accent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '7px 0',
      borderBottom: '1px solid var(--line-2)',
      gap: 12,
    }}>
      <span className="label" style={{ fontSize: 10 }}>{k}</span>
      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: accent ? 'var(--acc)' : 'var(--ink)' }}>
        {v}{unit && <span style={{ color: 'var(--mute)', fontWeight: 400, marginLeft: 3 }}>{unit}</span>}
      </span>
    </div>
  );
}

// ───────── Photo placeholder ─────────
function HFPhoto({ h = 180, caption = 'N38459 · photo by spotters.net' }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        width: '100%', height: h,
        background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--line-2) 100%)',
        border: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* crude plane silhouette */}
        <svg width="60%" height="60%" viewBox="0 0 200 100" style={{ opacity: 0.18 }}>
          <path d="M 20 52 L 70 48 L 95 30 L 100 30 L 95 48 L 140 45 L 155 35 L 160 35 L 155 48 L 180 50 L 180 54 L 155 56 L 160 68 L 155 68 L 140 58 L 95 56 L 100 75 L 95 75 L 70 56 L 20 52 Z"
            fill="var(--ink)" />
        </svg>
        <div className="mono" style={{
          position: 'absolute', bottom: 6, left: 8,
          fontSize: 9, letterSpacing: '0.06em',
          color: 'var(--mute)', textTransform: 'uppercase',
        }}>{caption}</div>
      </div>
    </div>
  );
}

// ───────── Route line ─────────
function HFRoute({ from = 'KSFO', to = 'KORD', fromCity = 'San Francisco', toCity = 'Chicago',
  progress = 0.42, eta = '3h 12m', depTime = '14:22', arrTime = '20:18' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{from}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{fromCity} · {depTime}</div>
        </div>
        <div style={{ flex: 1, position: 'relative', height: 22, marginBottom: 6 }}>
          <svg viewBox="0 0 200 22" preserveAspectRatio="none" width="100%" height="22">
            <path d="M 4 16 Q 100 0, 196 16" fill="none" stroke="var(--line)" strokeWidth="1" />
            <path d={`M 4 16 Q ${4 + 96 * progress * 2} ${16 - 16 * progress * (2 - progress * 2)}, ${4 + 192 * progress} ${16 - 16 * Math.sin(progress * Math.PI)}`}
              fill="none" stroke="var(--acc)" strokeWidth="1.5" />
            <circle cx="4" cy="16" r="2.5" fill="var(--ink)" />
            <circle cx="196" cy="16" r="2.5" fill="var(--ink)" />
            <g transform={`translate(${4 + 192 * progress}, ${16 - 16 * Math.sin(progress * Math.PI)})`}>
              <circle r="6" fill="var(--acc)" opacity="0.2" />
              <path d="M -4 0 L 4 -1.5 L 4 1.5 Z" fill="var(--acc)" />
            </g>
          </svg>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{to}</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{toCity} · {arrTime}</div>
        </div>
      </div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {Math.round(progress * 100)}% complete · ETA in {eta}
      </div>
    </div>
  );
}

// ───────── History strip ─────────
function HFHistory({ items = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="label">Recent overhead · last hour</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--mute)' }}>{items.length} flights</div>
      </div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }} className="no-sb">
        {items.map((it, i) => (
          <div key={i} style={{
            flex: '0 0 auto', minWidth: 118,
            padding: '8px 10px',
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderLeft: `2px solid ${it.active ? 'var(--acc)' : 'var(--line)'}`,
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: it.active ? 'var(--acc)' : 'var(--ink)' }}>{it.cs}</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--mute)', letterSpacing: '0.05em' }}>{it.route}</div>
            <div className="mono" style={{ fontSize: 9, color: 'var(--mute-2)' }}>
              {it.when} · {it.alt}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────── Section header (aesthetic-aware) ─────────
function HFSectionTitle({ children, sub }) {
  return (
    <div>
      <div className="display" style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.1 }}>{children}</div>
      {sub && <div className="label" style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

Object.assign(window, {
  HFStatusBar, HFLogo, HFStat, HFRow, HFPhoto, HFRoute, HFHistory, HFSectionTitle,
});
