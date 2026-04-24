import React, { useContext, useEffect, useState, useRef } from 'react';
import { AircraftContext } from '../../contexts/AircraftContext';
import { SettingsContext } from '../../contexts/SettingsContext';
import { isVisible } from '../../lib/adsb';
import { useDeviceOrientation } from '../../lib/orientation';
import { useGeolocation } from '../../lib/geolocation';
import './EngineRoom.css';

export default function EngineRoom() {
  const { allAircraft } = useContext(AircraftContext);
  const { observer, locationMode } = useContext(SettingsContext);
  
  // Get GPS data (Tesla fallback)
  const geo = useGeolocation(locationMode === 'field' || true); // Force on for debug
  const orientation = useDeviceOrientation(geo.position?.heading);
  const { heading, isSupported, permissionState, requestPermission } = orientation;
  
  const [metrics, setMetrics] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [uiLogs, setUiLogs] = useState([]);
  const logsRef = useRef([]);

  // Intercept console.log specifically for this component to show on UI
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type, args) => {
      const msg = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      const newEntry = { 
        id: Date.now() + Math.random(),
        time: new Date().toLocaleTimeString(), 
        type, 
        msg 
      };
      
      // Filter for orientation logs to keep the UI clean
      if (msg.includes('[orientation]')) {
        logsRef.current = [newEntry, ...logsRef.current].slice(0, 10);
        setUiLogs([...logsRef.current]);
      }
    };

    console.log = (...args) => {
      addLog('info', args);
      originalLog.apply(console, args);
    };
    console.warn = (...args) => {
      addLog('warn', args);
      originalWarn.apply(console, args);
    };
    console.error = (...args) => {
      addLog('error', args);
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    setLastUpdate(new Date());
  }, [allAircraft]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/debug');
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error('Failed to fetch debug metrics', err);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="engine-room">
      <div className="er-header">
        <div>
          <h1>Engine Room Diagnostic Dashboard v1.8</h1>
          <p className="label" style={{ marginTop: 4 }}>Last data update: {lastUpdate.toLocaleTimeString()}</p>
        </div>
        <div className="er-actions">
          <a href="/" className="btn">Exit Diagnostic Mode</a>
        </div>
      </div>
      
      <div className="er-metrics-panel">
        <h2 className="er-section-title">System Diagnostics</h2>
        <div className="er-metrics-grid">
          {/* Device Orientation & GPS Card */}
          <div className="er-metric-card">
            <h3>Orientation & GPS</h3>
            <div className="er-metric-row">
              <span className="er-label">Active Heading:</span>
              <span className="er-value accent">{Math.round(heading)}°</span>
            </div>
            
            <div style={{ borderTop: '1px solid var(--line-2)', margin: '8px 0', paddingTop: '8px' }}>
              <div className="er-metric-row">
                <span className="er-label">Lat:</span>
                <span className="er-value">{geo.position?.lat?.toFixed(5) ?? 'null'}</span>
              </div>
              <div className="er-metric-row">
                <span className="er-label">Lon:</span>
                <span className="er-value">{geo.position?.lon?.toFixed(5) ?? 'null'}</span>
              </div>
              <div className="er-metric-row">
                <span className="er-label">GPS Heading:</span>
                <span className="er-value">{geo.position?.heading != null ? `${Math.round(geo.position.heading)}°` : 'null'}</span>
              </div>
              <div className="er-metric-row">
                <span className="er-label">Accuracy:</span>
                <span className="er-value">{geo.position?.accuracy != null ? `${Math.round(geo.position.accuracy)}m` : 'null'}</span>
              </div>
              <div className="er-metric-row">
                <span className="er-label">Altitude:</span>
                <span className="er-value">
                  {geo.position?.altitude != null 
                    ? `${Math.round(geo.position.altitude * 3.28084)}ft` // Convert m to ft
                    : 'null'}
                </span>
              </div>
              <div className="er-metric-row">
                <span className="er-label">Speed:</span>
                <span className="er-value">
                  {geo.position?.speed != null 
                    ? `${Math.round(geo.position.speed * 2.23694)}mph` // Convert m/s to mph
                    : 'null'}
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--line-2)', margin: '8px 0', paddingTop: '8px' }}>
              <div className="er-metric-row">
                <span className="er-label">Sensors Supported:</span>
                <span className="er-value">{String(isSupported)}</span>
              </div>
              <div className="er-metric-row">
                <span className="er-label">Sensor Perm:</span>
                <span className="er-value">{permissionState}</span>
              </div>
            </div>
            
            {isSupported && permissionState !== 'granted' && (
              <button 
                className="btn primary" 
                style={{ width: '100%', marginTop: 12, padding: '8px' }}
                onClick={requestPermission}
              >
                Enable Sensors
              </button>
            )}
          </div>

          {/* Orientation Event Log */}
          <div className="er-metric-card">
            <h3>Event Log</h3>
            <div style={{ maxHeight: '180px', overflowY: 'auto', fontSize: '10px', fontFamily: 'var(--mono)' }}>
              {uiLogs.length > 0 ? uiLogs.map(log => (
                <div key={log.id} style={{ borderBottom: '1px solid var(--line-2)', padding: '2px 0', color: log.type === 'error' ? 'var(--warn)' : 'inherit' }}>
                   [{log.time}] {log.msg.replace('[orientation] ', '')}
                </div>
              )) : (
                <div style={{ color: 'var(--mute)' }}>Waiting for events...</div>
              )}
            </div>
          </div>

          {metrics ? (
            <>
              <div className="er-metric-card">
                <h3>API Quota</h3>
                <div className="er-metric-row">
                  <span className="er-label">Used:</span>
                  <span className="er-value">{metrics.quota.used} / {metrics.quota.limit}</span>
                </div>
              </div>
              <div className="er-metric-card">
                <h3>Sessions</h3>
                <div className="er-metric-row">
                  <span className="er-label">Active:</span>
                  <span className="er-value">{metrics.sessions.active}</span>
                </div>
                <div className="er-metric-row">
                  <span className="er-label">IPs:</span>
                  <span className="er-value">{metrics.sessions.ips.join(', ') || 'None'}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="er-metric-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="er-loading">Loading server metrics...</p>
            </div>
          )}
        </div>
      </div>

      <div className="er-filter-log">
        <h2 className="er-section-title">Filter Log Table ({allAircraft.length} Aircraft)</h2>
        <div className="er-table-container">
          <table className="er-table">
            <thead>
              <tr>
                <th>Hex</th>
                <th>Flight</th>
                <th>Alt (ft)</th>
                <th>Lat</th>
                <th>Lon</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {allAircraft.map(ac => {
                const accepted = isVisible(ac, observer);
                return (
                  <tr key={ac.hex || Math.random()} className={accepted ? 'er-row-accepted' : 'er-row-rejected'}>
                    <td className="mono">{ac.hex}</td>
                    <td className="mono">{ac.flight || 'N/A'}</td>
                    <td className="mono">{ac.alt_baro}</td>
                    <td className="mono">{ac.lat}</td>
                    <td className="mono">{ac.lon}</td>
                    <td>
                      <span className={`er-status-badge ${accepted ? 'er-badge-accepted' : 'er-badge-rejected'}`}>
                        {accepted ? 'ACCEPTED' : 'REJECTED'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {allAircraft.length === 0 && (
                <tr>
                  <td colSpan="6" className="er-no-data">No raw aircraft data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
