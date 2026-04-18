import { useState, useContext } from 'react'
import { SettingsContext } from '../../contexts/SettingsContext'

const STEPS = 3

// Step 1 — ADS-B Receiver
function StepReceiver({ adsbUrl, setAdsbUrl, testStatus, onTest, onNext }) {
  const canProceed = testStatus === 'ok'
  return (
    <>
      <div>
        <div className="label">Get started</div>
        <div className="fr-h serif">Point us<br />at your sky.</div>
        <div className="fr-desc">
          Skywatcher talks to your local ADS-B receiver and tells you exactly where to look
          for the aircraft overhead. First, tell us where your receiver lives on your network.
        </div>
        <div style={{ display: 'flex', gap: 20, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--mute)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <span>&#9702; Works with dump1090 / tar1090</span>
          <span>&#9702; No cloud account needed</span>
        </div>
      </div>
      <div className="fr-form">
        <div className="fr-field mono">
          <label>
            <span className="label">Receiver endpoint</span>
            <input
              value={adsbUrl}
              onChange={e => setAdsbUrl(e.target.value)}
              placeholder="http://pi.local:8080"
              spellCheck={false}
            />
          </label>
        </div>
        {testStatus === 'error' && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--warn)', letterSpacing: '0.04em' }}>
            Could not reach receiver — check the URL and try again.
          </div>
        )}
        {testStatus === 'ok' && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--pos)', letterSpacing: '0.04em' }}>
            &#10003; Connected successfully.
          </div>
        )}
        <div className="fr-btns">
          <button
            className="btn primary"
            onClick={onTest}
            disabled={testStatus === 'testing' || !adsbUrl.trim()}
          >
            {testStatus === 'testing' ? 'Testing…' : 'Test connection'}
          </button>
          <button
            className="btn"
            onClick={onNext}
            disabled={!canProceed}
            style={{ opacity: canProceed ? 1 : 0.4, cursor: canProceed ? 'pointer' : 'not-allowed' }}
          >
            Next
          </button>
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.06em', marginTop: 4 }}>
          Enter the base URL of your receiver — the endpoint /api/aircraft will be used to verify.
        </div>
      </div>
    </>
  )
}

// Step 2 — Observer Location
function StepLocation({ lat, setLat, lon, setLon, elev, setElev, obstructionAngle, setObstructionAngle, onBack, onNext }) {
  const allFilled = lat.trim() && lon.trim() && elev.trim() && obstructionAngle.trim()
  return (
    <>
      <div>
        <div className="label">Your location</div>
        <div className="fr-h serif">Where on<br />Earth are you?</div>
        <div className="fr-desc">
          Skywatcher uses your coordinates to calculate which aircraft are overhead
          and their elevation angles. Elevation and obstruction angle determine
          what's visible above your local horizon.
        </div>
      </div>
      <div className="fr-form">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="fr-field mono">
            <label>
              <span className="label">Latitude</span>
              <input
                value={lat}
                onChange={e => setLat(e.target.value)}
                placeholder="37.7749"
                inputMode="decimal"
              />
            </label>
          </div>
          <div className="fr-field mono">
            <label>
              <span className="label">Longitude</span>
              <input
                value={lon}
                onChange={e => setLon(e.target.value)}
                placeholder="-122.4194"
                inputMode="decimal"
              />
            </label>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="fr-field mono">
            <label>
              <span className="label">Elevation (ft)</span>
              <input
                value={elev}
                onChange={e => setElev(e.target.value)}
                placeholder="52"
                inputMode="decimal"
              />
            </label>
          </div>
          <div className="fr-field mono">
            <label>
              <span className="label">Obstruction angle (°)</span>
              <input
                value={obstructionAngle}
                onChange={e => setObstructionAngle(e.target.value)}
                placeholder="14.2"
                inputMode="decimal"
              />
            </label>
          </div>
        </div>
        <div className="fr-btns">
          <button className="btn primary" onClick={onNext} disabled={!allFilled} style={{ opacity: allFilled ? 1 : 0.4, cursor: allFilled ? 'pointer' : 'not-allowed' }}>
            Next
          </button>
          <button className="btn" onClick={onBack}>Back</button>
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.06em', marginTop: 4 }}>
          Decimal degrees — e.g. 37.7749, -122.4194. Obstruction angle default: 14.2° (two-story house at 75 ft).
        </div>
      </div>
    </>
  )
}

// Step 3 — FlightAware API Key
function StepApiKey({ faKey, setFaKey, submitStatus, submitError, onBack, onSubmit }) {
  return (
    <>
      <div>
        <div className="label">Optional enrichment</div>
        <div className="fr-h serif">Unlock flight<br />details.</div>
        <div className="fr-desc">
          A FlightAware AeroAPI key adds origin, destination, operator, and live
          progress to every aircraft. It's optional — Skywatcher works without it.
        </div>
      </div>
      <div className="fr-form">
        <div className="fr-field mono">
          <label>
            <span className="label">FlightAware AeroAPI key</span>
            <input
              type="password"
              value={faKey}
              onChange={e => setFaKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--mute)', letterSpacing: '0.06em' }}>
          Get your free key at flightaware.com/commercial/aeroapi
        </div>
        {submitStatus === 'error' && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--warn)', letterSpacing: '0.04em' }}>
            {submitError || 'Setup failed — please try again.'}
          </div>
        )}
        {submitStatus === 'saved' && (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--pos)', letterSpacing: '0.04em' }}>
            Saved — key is stored securely and will never be displayed again.
          </div>
        )}
        <div className="fr-btns">
          <button
            className="btn primary"
            onClick={onSubmit}
            disabled={submitStatus === 'submitting'}
          >
            {submitStatus === 'submitting' ? 'Saving…' : 'Finish setup'}
          </button>
          <button className="btn" onClick={onBack} disabled={submitStatus === 'submitting'}>
            Back
          </button>
        </div>
      </div>
    </>
  )
}

// Completion screen
function Completion() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <div className="live-dot" style={{ width: 12, height: 12 }} />
      <div className="serif" style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
        All set — finding aircraft…
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--mute)', letterSpacing: '0.08em' }}>
        Polling your receiver now.
      </div>
    </div>
  )
}

export default function FirstRun({ onComplete }) {
  const { updateObserver } = useContext(SettingsContext)

  // Step state
  const [step, setStep] = useState(1)

  // Step 1 — ADS-B
  const [adsbUrl, setAdsbUrl] = useState('')
  const [testStatus, setTestStatus] = useState('idle') // idle | testing | ok | error

  // Step 2 — Location
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [elev, setElev] = useState('')
  const [obstructionAngle, setObstructionAngle] = useState('14.2')

  // Step 3 — FA Key
  const [faKey, setFaKey] = useState('')
  const [submitStatus, setSubmitStatus] = useState('idle') // idle | submitting | saved | error
  const [submitError, setSubmitError] = useState(null)

  // Completion
  const [complete, setComplete] = useState(false)

  async function handleTest() {
    setTestStatus('testing')
    try {
      const res = await fetch('/api/aircraft')
      if (res.ok) {
        setTestStatus('ok')
      } else {
        setTestStatus('error')
      }
    } catch {
      setTestStatus('error')
    }
  }

  async function handleSubmit() {
    setSubmitStatus('submitting')
    setSubmitError(null)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adsbUrl,
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          elev: parseFloat(elev),
          obstructionAngle: parseFloat(obstructionAngle),
          faKey,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        setSubmitStatus('error')
        setSubmitError(text || 'Setup failed — please try again.')
        return
      }
      // Key saved — clear from state immediately
      setFaKey('')
      setSubmitStatus('saved')

      // Persist observer settings to context
      updateObserver({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        elev: parseFloat(elev),
        obstructionAngle: parseFloat(obstructionAngle),
      })
      localStorage.setItem('skywatcher-configured', 'true')

      // Brief "saved" pause, then show completion screen, then fire onComplete
      setTimeout(() => {
        setComplete(true)
        setTimeout(() => {
          onComplete()
        }, 1800)
      }, 900)
    } catch {
      setSubmitStatus('error')
      setSubmitError('Network error — check your connection and try again.')
    }
  }

  if (complete) {
    return (
      <div className="first-run">
        <div className="first-run-head">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
          </svg>
          <span className="serif" style={{ fontSize: 18 }}>Skywatcher</span>
        </div>
        <Completion />
      </div>
    )
  }

  return (
    <div className="first-run">
      <div className="first-run-head">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
        </svg>
        <span className="serif" style={{ fontSize: 18 }}>Skywatcher</span>
        <span className="label" style={{ marginLeft: 'auto' }}>Setup &middot; {step} of {STEPS}</span>
      </div>
      <div className="first-run-body">
        {step === 1 && (
          <StepReceiver
            adsbUrl={adsbUrl}
            setAdsbUrl={setAdsbUrl}
            testStatus={testStatus}
            onTest={handleTest}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepLocation
            lat={lat}
            setLat={setLat}
            lon={lon}
            setLon={setLon}
            elev={elev}
            setElev={setElev}
            obstructionAngle={obstructionAngle}
            setObstructionAngle={setObstructionAngle}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepApiKey
            faKey={faKey}
            setFaKey={setFaKey}
            submitStatus={submitStatus}
            submitError={submitError}
            onBack={() => setStep(2)}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}
