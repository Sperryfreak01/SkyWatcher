import React, { useContext, useEffect, useState } from 'react';
import { AircraftContext } from '../../contexts/AircraftContext';
import { SettingsContext } from '../../contexts/SettingsContext';
import { isVisible } from '../../lib/adsb';
import './EngineRoom.css';

export default function EngineRoom() {
  const { allAircraft } = useContext(AircraftContext);
  const { observer } = useContext(SettingsContext);
  const [metrics, setMetrics] = useState(null);

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
        <h1>Engine Room Diagnostic Dashboard</h1>
        <div className="er-actions">
          <a href="/" className="btn">Exit Diagnostic Mode</a>
        </div>
      </div>
      
      <div className="er-metrics-panel">
        <h2 className="er-section-title">Server Metrics</h2>
        {metrics ? (
          <div className="er-metrics-grid">
            <div className="er-metric-card">
              <h3>Quota</h3>
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
          </div>
        ) : (
          <p className="er-loading">Loading metrics...</p>
        )}
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
