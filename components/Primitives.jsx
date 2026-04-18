// Primitives.jsx — shared wireframe primitives

// Placeholder image box (striped)
function Placeholder({ w = '100%', h = 120, label = 'photo', style = {} }) {
  return (
    <div style={{
      width: w, height: h,
      background: 'repeating-linear-gradient(135deg, var(--soft), var(--soft) 6px, var(--bg) 6px, var(--bg) 12px)',
      border: '1px dashed var(--line)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--mute)',
      letterSpacing: 0.5, textTransform: 'uppercase',
      ...style,
    }}>{label}</div>
  );
}

// Data row — label + value, mono
function DataRow({ k, v, accent = false }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '5px 0',
      borderBottom: '1px dotted var(--line)',
      fontFamily: 'var(--mono)', fontSize: 11,
    }}>
      <span style={{ color: 'var(--mute)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{k}</span>
      <span style={{ color: accent ? 'var(--acc1)' : 'var(--ink)', fontWeight: 600 }}>{v}</span>
    </div>
  );
}

// Section title inside a wireframe artboard
function WFTitle({ children, sub, size = 14 }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: size, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--sketch)' }}>
        {children}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--mute)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Mini top bar that goes in every screen
function TopBar({ sub = 'LOCAL · 37.78°N 122.41°W', mode = 'live' }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 14px',
      borderBottom: '1px solid var(--line)',
      background: 'var(--bg)',
    }}>
      <div style={{ fontFamily: 'var(--sketch)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
        skywatcher
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', letterSpacing: 0.5 }}>
        {sub}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 9, color: mode === 'live' ? 'var(--acc1)' : 'var(--mute)', fontWeight: 700 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: mode === 'live' ? 'var(--acc1)' : 'var(--mute)' }} />
        {mode === 'live' ? 'LIVE' : 'QUIET'}
      </div>
    </div>
  );
}

// Route line: KSFO ----✈---- KORD
function RouteLine({ from = 'KSFO', to = 'KORD', progress = 0.42, compact = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--mono)', fontSize: compact ? 10 : 12 }}>
      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{from}</span>
      <div style={{ flex: 1, position: 'relative', height: 14 }}>
        <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 1, background: 'var(--line)' }} />
        <div style={{ position: 'absolute', top: 6, left: 0, width: `${progress * 100}%`, height: 2, background: 'var(--acc1)' }} />
        <div style={{
          position: 'absolute', top: 0, left: `calc(${progress * 100}% - 7px)`,
          fontSize: 12, color: 'var(--acc1)',
        }}>✈</div>
      </div>
      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{to}</span>
    </div>
  );
}

// Great circle route map (rough)
function RouteMap({ w = '100%', h = 110 }) {
  return (
    <div style={{ width: w, height: h, position: 'relative', background: 'var(--soft)', border: '1px solid var(--line)', overflow: 'hidden' }}>
      <svg viewBox="0 0 240 110" width="100%" height="100%" preserveAspectRatio="none">
        {/* crude continent outline */}
        <path d="M 10 60 Q 40 20, 80 40 T 150 30 Q 200 25, 230 55 L 230 95 Q 180 100, 140 90 T 60 95 Q 20 100, 10 80 Z"
          fill="var(--bg)" stroke="var(--line)" strokeWidth="0.5" />
        {/* route arc */}
        <path d="M 40 75 Q 120 10, 200 45" fill="none" stroke="var(--acc1)" strokeWidth="1.5" strokeDasharray="3 2" />
        <circle cx="40" cy="75" r="3" fill="var(--ink)" />
        <circle cx="200" cy="45" r="3" fill="var(--ink)" />
        {/* plane */}
        <g transform="translate(110, 30)">
          <circle r="5" fill="var(--acc1)" opacity="0.2" />
          <text fontSize="9" fontFamily="var(--mono)" fill="var(--acc1)" textAnchor="middle" dominantBaseline="middle">✈</text>
        </g>
        <text x="40" y="90" fontSize="7" fontFamily="var(--mono)" fill="var(--mute)">SFO</text>
        <text x="200" y="38" fontSize="7" fontFamily="var(--mono)" fill="var(--mute)">ORD</text>
      </svg>
    </div>
  );
}

// Scribble underline
function Scribble({ w = 60 }) {
  return (
    <svg width={w} height="6" viewBox={`0 0 ${w} 6`}>
      <path d={`M 2 3 Q ${w * 0.25} 0, ${w * 0.5} 3 T ${w - 2} 3`}
        fill="none" stroke="var(--acc2)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

Object.assign(window, { Placeholder, DataRow, WFTitle, TopBar, RouteLine, RouteMap, Scribble });
