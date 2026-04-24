import React, { useContext, useEffect, useState } from 'react';
import { AircraftContext } from '../../contexts/AircraftContext';
import { SettingsContext } from '../../contexts/SettingsContext';
import { isVisible } from '../../lib/adsb';
import { useDeviceOrientation } from '../../lib/orientation';
import './EngineRoom.css';

export default function EngineRoom() {
  const { allAircraft } = useContext(AircraftContext);
  const { observer } = useContext(SettingsContext);
  const orientation = useDeviceOrientation();
  const { heading, isSupported, permissionState, requestPermission } = orientation;
  
  const [metrics, setMetrics] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

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
          <h1>Engine Room Diagnostic Dashboard v1.2</h1>
          <p className="label" style={{ marginTop: 4 }}>Last data update: {lastUpdate.toLocaleTimeString()}</p>
        </div>
        <div className="er-actions">
          <a href="/" className="btn">Exit Diagnostic Mode</a>
        </div>
      </div>
      
      <div className="er-metrics-panel">
        <h2 className="er-section-title">System Diagnostics</h2>
        <div className="er-metrics-grid">
          {/* Device Orientation Card */}
          <div className="er-metric-card">
            <h3>Device Orientation</h3>
            <div className="er-metric-row">
              <span className="er-label">Heading:</span>
              <span className="er-value accent">{Math.round(heading)}°</span>
            </div>
            <div className="er-metric-row">
              <span className="er-label">Supported:</span>
              <span className="er-value">{String(isSupported)}</span>
            </div>
            <div className="er-metric-row">
              <span className="er-label">Permission:</span>
              <span className="er-value">{permissionState}</span>
            </div>
            {isSupported && permissionState !== 'granted' && (
              <button 
                className="btn primary" 
                style={{ width: '100%', marginTop: 12, padding: '8px' }}
                onClick={requestPermission}
              >
                Enable Compass
              </button>
            )}
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
              <div className="er-metric-card">
                <h3>Latency</h3>
                <div className="er-metric-row">
                  <span className="er-label">Last:</span>
                  <span className="er-value">{metrics.latency.last}ms</span>
                </div>
                <div className="er-metric-row">
                  <span className="er-label">Avg:</span>
                  <span className="er-value">{metrics.latency.avg.toFixed(2)}ms</span>
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
