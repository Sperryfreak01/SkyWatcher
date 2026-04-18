// Phones.jsx — phone (portrait) variants of the four layouts + empty state

const PHONE_W = 320, PHONE_H = 640;

function PhoneFrame({ children, label }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        width: PHONE_W + 16, height: PHONE_H + 16,
        borderRadius: 38, border: '2px solid var(--ink)',
        padding: 8, background: 'var(--bg)',
        boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
        boxSizing: 'content-box',
      }}>
        <div style={{
          width: PHONE_W, height: PHONE_H,
          borderRadius: 28, overflow: 'hidden',
          background: 'var(--bg)', position: 'relative',
        }}>
          {/* notch */}
          <div style={{
            position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
            width: 90, height: 18, borderRadius: 10, background: 'var(--ink)', zIndex: 10,
          }} />
          <div style={{ paddingTop: 28, height: '100%', display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Phone v1: chart-hero
function PhoneChartHero({ chart = 'classic', density = 'full' }) {
  const Chart = chart === 'dome' ? SkyChartDome : chart === 'arrow' ? SkyChartArrow : SkyChartClassic;
  return (
    <PhoneFrame>
      <TopBar sub="LIVE" />
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Chart size={240} />
        </div>
        <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700 }}>
          LOOK ESE · <span style={{ color: 'var(--acc1)' }}>42° UP</span>
        </div>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)' }}>FLIGHT</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700 }}>UAL482</div>
          <div style={{ fontSize: 10, color: 'var(--mute)' }}>B737-900ER · N38459</div>
        </div>
        <RouteLine from="KSFO" to="KORD" progress={0.42} compact />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <MiniStat k="ALT" v="34k" />
          <MiniStat k="SPD" v="451" />
          <MiniStat k="DIST" v="6.4" />
        </div>
        {density === 'full' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <DataRow k="HDG" v="072°" />
            <DataRow k="SQK" v="2145" />
          </div>
        )}
      </div>
    </PhoneFrame>
  );
}

// --- Phone v2: identity hero
function PhoneIdentityHero({ chart = 'classic' }) {
  const Chart = chart === 'dome' ? SkyChartDome : chart === 'arrow' ? SkyChartArrow : SkyChartClassic;
  return (
    <PhoneFrame>
      <TopBar sub="LIVE" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Placeholder w="100%" h={200} label="aircraft photo" style={{ border: 'none', borderBottom: '1px solid var(--line)' }} />
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700 }}>UAL482</div>
              <div style={{ fontSize: 10, color: 'var(--mute)' }}>B737-900ER</div>
            </div>
            <div style={{ border: '1px solid var(--line)', padding: 4 }}>
              <Chart size={90} />
            </div>
          </div>
          <RouteLine from="KSFO" to="KORD" progress={0.42} compact />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <DataRow k="AZ" v="110° ESE" accent />
            <DataRow k="EL" v="42°" accent />
            <DataRow k="ALT" v="34 000 ft" />
            <DataRow k="SPD" v="451 kts" />
            <DataRow k="DIST" v="6.4 nm" />
            <DataRow k="HDG" v="072°" />
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}

// --- Phone v3: stacked (balanced → vertical sections)
function PhoneBalanced({ chart = 'classic' }) {
  const Chart = chart === 'dome' ? SkyChartDome : chart === 'arrow' ? SkyChartArrow : SkyChartClassic;
  return (
    <PhoneFrame>
      <TopBar sub="LIVE" />
      <div className="no-sb" style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ border: '1px solid var(--line)', padding: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <WFTitle sub="where to look" size={12}>Sky chart</WFTitle>
          <Chart size={200} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700 }}>ESE · 42°</div>
        </div>
        <div style={{ border: '1px solid var(--line)', padding: 10, display: 'flex', gap: 10 }}>
          <Placeholder w={90} h={70} label="photo" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700 }}>UAL482</div>
            <div style={{ fontSize: 10, color: 'var(--mute)' }}>B737-900ER</div>
            <RouteLine from="SFO" to="ORD" progress={0.42} compact />
          </div>
        </div>
        <div style={{ border: '1px solid var(--line)', padding: 10 }}>
          <WFTitle sub="adsb" size={12}>Data</WFTitle>
          <DataRow k="Altitude" v="34 000 ft" accent />
          <DataRow k="Speed" v="451 kts" />
          <DataRow k="Heading" v="072°" />
          <DataRow k="Distance" v="6.4 nm" />
          <DataRow k="Squawk" v="2145" />
        </div>
      </div>
    </PhoneFrame>
  );
}

// --- Phone v4: HUD tile grid
function PhoneHUD({ chart = 'classic' }) {
  const Chart = chart === 'dome' ? SkyChartDome : chart === 'arrow' ? SkyChartArrow : SkyChartClassic;
  return (
    <PhoneFrame>
      <TopBar sub="LIVE" />
      <div style={{ flex: 1, padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, overflow: 'hidden', gridAutoRows: 'min-content' }}>
        <div style={{ gridColumn: '1 / span 2', border: '1px solid var(--line)', padding: 8, display: 'flex', justifyContent: 'center' }}>
          <Chart size={180} />
        </div>
        <TileSm title="Callsign"><Big>UAL482</Big></TileSm>
        <TileSm title="Route"><div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700 }}>SFO→ORD</div></TileSm>
        <TileSm title="AZ"><Big accent>110°</Big></TileSm>
        <TileSm title="EL"><Big accent>42°</Big></TileSm>
        <TileSm title="ALT"><Big>34k</Big><Unit>ft</Unit></TileSm>
        <TileSm title="SPD"><Big>451</Big><Unit>kts</Unit></TileSm>
        <TileSm title="DIST"><Big>6.4</Big><Unit>nm</Unit></TileSm>
        <TileSm title="SQK"><Big>2145</Big></TileSm>
      </div>
    </PhoneFrame>
  );
}
function TileSm({ title, children }) {
  return (
    <div style={{ border: '1px solid var(--line)', padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--mute)', letterSpacing: 0.6 }}>{title}</div>
      {children}
    </div>
  );
}
function MiniStat({ k, v }) {
  return (
    <div style={{ border: '1px solid var(--line)', padding: 6, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--mute)' }}>{k}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700 }}>{v}</div>
    </div>
  );
}

// --- Phone empty state
function PhoneEmpty() {
  return (
    <PhoneFrame>
      <TopBar mode="quiet" sub="QUIET" />
      <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <div style={{ fontFamily: 'var(--sketch)', fontSize: 18, color: 'var(--mute)' }}>Quiet skies.</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--mute)', letterSpacing: 0.5, marginTop: 2 }}>NO AIRCRAFT VISIBLE</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <WeatherTile k="TEMP" v="62°" sub="feels 59°" />
          <WeatherTile k="SKY" v="Clear" sub="0% cloud" accent />
          <WeatherTile k="WIND" v="8 kts" sub="W" />
          <WeatherTile k="VIS" v="10 mi" sub="unlimited" />
          <WeatherTile k="SUN" v="6:42p" sub="sets 2h 18m" />
          <WeatherTile k="MOON" v="64%" sub="waxing" />
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--mute)', textAlign: 'center', marginTop: 'auto', paddingBottom: 10 }}>
          LAST AIRCRAFT · SWA1132 · 14 MIN AGO
        </div>
      </div>
    </PhoneFrame>
  );
}

Object.assign(window, {
  PhoneFrame, PhoneChartHero, PhoneIdentityHero, PhoneBalanced, PhoneHUD, PhoneEmpty,
});
