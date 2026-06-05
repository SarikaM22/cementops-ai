import { useState, useEffect } from 'react'
import { fetchKPI, fetchStatus, fetchSummary, fetchAlerts, fetchForecast, fetchShap, fetchPHM } from './api'

// UltraTech brand colors from logo
const UT_RED    = '#C0392B'
const UT_ORANGE = '#E67E22'
const UT_YELLOW = '#F1C40F'
const UT_DARK   = '#1a0a00'
const UT_CARD   = '#1f0f00'
const UT_BORDER = '#3d1f00'
const WHITE     = '#ffffff'
const GRAY      = '#aaa'
const GREEN     = '#27ae60'
const BLUE      = '#2980b9'

function UltraTechLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
      <svg width="36" height="36" viewBox="0 0 100 100">
        <polygon points="50,5 95,50 50,95 5,50" fill={UT_RED} />
        <polygon points="50,5 95,50 50,50" fill={UT_ORANGE} />
        <polygon points="5,50 50,50 50,95" fill="#8B0000" />
        <polygon points="50,5 50,50 30,30" fill="#d44000" />
      </svg>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: WHITE, letterSpacing: '0.02em' }}>CementOps AI</div>
        <div style={{ fontSize: 9, color: UT_YELLOW, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>UltraTech Cement</div>
      </div>
    </div>
  )
}

function LiveDot() {
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: GREEN, marginRight: 6, boxShadow: `0 0 6px ${GREEN}` }}></span>
}

function KPICard({ label, value, unit, status, icon }) {
  const borderColor = status === 'normal' ? GREEN : status === 'warning' ? UT_ORANGE : UT_RED
  return (
    <div style={{ background: UT_CARD, border: `1px solid ${borderColor}55`, borderTop: `3px solid ${borderColor}`, borderRadius: 10, padding: '1.1rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, background: `${borderColor}11`, borderRadius: '50%' }}></div>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: WHITE }}>
        {value}<span style={{ fontSize: 13, color: '#888', marginLeft: 3, fontWeight: 400 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 11, color: borderColor, marginTop: 5 }}>● {status?.toUpperCase()}</div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: UT_CARD, border: `1px solid ${color}44`, borderRadius: 10, padding: '0.9rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function Overview() {
  const [kpi, setKpi] = useState(null)
  const [status, setStatus] = useState(null)
  const [summary, setSummary] = useState(null)
  const [lastUpdate, setLastUpdate] = useState('')

  const load = async () => {
    try {
      const [k, s, sum] = await Promise.all([fetchKPI(), fetchStatus(), fetchSummary()])
      setKpi(k.data); setStatus(s.data); setSummary(sum.data)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch { }
  }

  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t) }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <LiveDot />
          <span style={{ fontSize: 12, color: GRAY }}>Live · updated {lastUpdate}</span>
        </div>
        <div style={{ background: UT_YELLOW, color: '#1a0a00', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>SHIFT B · {new Date().toLocaleDateString()}</div>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          <StatCard label="Total readings" value={summary.total_readings?.toLocaleString()} color={GREEN} />
          <StatCard label="Anomaly rate" value={`${summary.anomaly_rate}%`} color={UT_ORANGE} />
          <StatCard label="Total alerts" value={summary.total_alerts?.toLocaleString()} color={UT_RED} />
        </div>
      )}

      {kpi && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
          <KPICard label="Kiln temperature" value={kpi.kiln_temperature} unit="°C" status={kpi.kiln_status} icon="🌡️" />
          <KPICard label="Feed rate" value={kpi.kiln_feed_rate} unit="t/hr" status="normal" icon="📦" />
          <KPICard label="Motor current" value={kpi.mill_motor_current} unit="A" status="normal" icon="⚡" />
          <KPICard label="OEE score" value={kpi.oee_score} unit="%" status={kpi.oee_score > 80 ? 'normal' : 'warning'} icon="📊" />
        </div>
      )}

      {status && (
        <div style={{ background: UT_CARD, border: `1px solid ${UT_BORDER}`, borderRadius: 10, padding: '1rem' }}>
          <div style={{ fontSize: 11, color: UT_YELLOW, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontWeight: 600 }}>Machine status</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {Object.entries(status).map(([machine, data]) => {
              const col = { green: GREEN, yellow: UT_ORANGE, red: UT_RED }[data.status] || GRAY
              const icons = { kiln: '🔥', ball_mill: '⚙️', cooler: '❄️' }
              return (
                <div key={machine} style={{ border: `1px solid ${col}44`, borderRadius: 8, padding: '0.85rem', background: '#160800' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: WHITE, textTransform: 'capitalize' }}>{icons[machine]} {machine.replace('_', ' ')}</span>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col, display: 'inline-block', boxShadow: `0 0 6px ${col}` }}></span>
                  </div>
                  <div style={{ height: 4, background: '#2a1000', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(data.alerts_last_10min * 10, 100)}%`, height: '100%', background: col, borderRadius: 2 }}></div>
                  </div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 5 }}>{data.alerts_last_10min} alerts / 10min</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Alerts() {
  const [alerts, setAlerts] = useState([])
  useEffect(() => {
    const load = async () => { try { const r = await fetchAlerts(); setAlerts(r.data) } catch { } }
    load(); const t = setInterval(load, 10000); return () => clearInterval(t)
  }, [])

  const sevColor = { high: UT_RED, medium: UT_ORANGE, low: GREEN }
  const icons = { spike: '⚡', drift: '📈', dropout: '📵' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ background: `${UT_RED}22`, border: `1px solid ${UT_RED}44`, borderRadius: 20, padding: '3px 14px', fontSize: 12, color: UT_RED, fontWeight: 500 }}>
          {alerts.length} active alerts
        </div>
        <div style={{ background: UT_YELLOW, color: UT_DARK, fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>
          {alerts.filter(a => a.severity === 'high').length} HIGH severity
        </div>
      </div>

      {alerts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: GREEN }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>All systems normal</div>
          <div style={{ fontSize: 12, color: GRAY, marginTop: 4 }}>No active alerts detected</div>
        </div>
      )}

      {alerts.map(a => (
        <div key={a.id} style={{ background: UT_CARD, border: `1px solid ${sevColor[a.severity] || GRAY}33`, borderLeft: `4px solid ${sevColor[a.severity] || GRAY}`, borderRadius: 10, padding: '1rem', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>{icons[a.anomaly_type] || '⚠️'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: WHITE, textTransform: 'capitalize' }}>
                {a.machine_id?.replace('_', ' ')} — {a.anomaly_type}
              </span>
            </div>
            <span style={{ fontSize: 11, background: `${sevColor[a.severity]}22`, color: sevColor[a.severity], padding: '2px 10px', borderRadius: 20, border: `1px solid ${sevColor[a.severity]}44`, fontWeight: 600 }}>
              {a.severity?.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{a.root_cause}</div>
          <div style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>{new Date(a.timestamp).toLocaleTimeString()}</div>
        </div>
      ))}
    </div>
  )
}

function Forecast() {
  const [forecast, setForecast] = useState(null)
  const [shap, setShap] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [f, s] = await Promise.all([fetchForecast(), fetchShap()])
        setForecast(f.data); setShap(s.data)
      } catch { }
    }
    load(); const t = setInterval(load, 15000); return () => clearInterval(t)
  }, [])

  const maxImp = shap?.top_features?.[0]?.importance || 1

  return (
    <div>
      {forecast && (
        <div style={{ background: `linear-gradient(135deg, ${UT_DARK} 0%, #2a0800 100%)`, border: `1px solid ${UT_RED}44`, borderRadius: 14, padding: '1.5rem', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: UT_YELLOW, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, fontWeight: 600 }}>
            🎯 XGBoost Forecast · 50 seconds ahead
          </div>
          <div style={{ fontSize: 52, fontWeight: 700, color: WHITE, lineHeight: 1, marginBottom: 4 }}>
            {forecast.predicted_kiln_temp}°C
          </div>
          <div style={{ height: 6, background: '#2a0800', borderRadius: 3, margin: '14px 0', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '10%', right: '10%', height: '100%', background: `${UT_ORANGE}33`, borderRadius: 3 }}></div>
            <div style={{ position: 'absolute', left: '48%', width: 3, height: '100%', background: UT_YELLOW, borderRadius: 2, boxShadow: `0 0 8px ${UT_YELLOW}` }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#777' }}>
            <span>Low: {forecast.confidence_low}°C</span>
            <span>High: {forecast.confidence_high}°C</span>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
            <div style={{ background: `${GREEN}22`, border: `1px solid ${GREEN}44`, borderRadius: 8, padding: '6px 14px', fontSize: 12, color: GREEN, fontWeight: 500 }}>
              MAPE {forecast.mape_pct}%
            </div>
            <div style={{ background: `${UT_YELLOW}22`, border: `1px solid ${UT_YELLOW}44`, borderRadius: 8, padding: '6px 14px', fontSize: 12, color: UT_YELLOW, fontWeight: 500 }}>
              RMSE {forecast.rmse}°C
            </div>
            <div style={{ background: `${UT_ORANGE}22`, border: `1px solid ${UT_ORANGE}44`, borderRadius: 8, padding: '6px 14px', fontSize: 12, color: UT_ORANGE, fontWeight: 500 }}>
              XGBoost
            </div>
          </div>
        </div>
      )}

      {shap?.top_features && (
        <div style={{ background: UT_CARD, border: `1px solid ${UT_BORDER}`, borderRadius: 14, padding: '1.25rem' }}>
          <div style={{ fontSize: 11, color: UT_YELLOW, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14, fontWeight: 600 }}>
            Top features driving forecast (SHAP)
          </div>
          {shap.top_features.slice(0, 8).map((f, i) => {
            const barColor = i === 0 ? UT_RED : i < 3 ? UT_ORANGE : UT_YELLOW
            return (
              <div key={f.feature} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#ccc' }}>{f.feature}</span>
                  <span style={{ color: '#666', fontFamily: 'monospace' }}>{f.importance.toFixed(3)}</span>
                </div>
                <div style={{ background: '#2a1000', borderRadius: 3, height: 5, overflow: 'hidden' }}>
                  <div style={{ width: `${(f.importance / maxImp) * 100}%`, height: 5, background: barColor, borderRadius: 3, boxShadow: `0 0 4px ${barColor}` }}></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function PHM() {
  const [data, setData] = useState(null)
  const [time, setTime] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetchPHM()
        setData(r.data)
        setTime(new Date().toLocaleTimeString())
      } catch { }
    }
    load(); const t = setInterval(load, 15000); return () => clearInterval(t)
  }, [])

  const statusColor = { healthy: GREEN, monitor: BLUE, warning: UT_ORANGE, critical: UT_RED }
  const statusBg = { healthy: '#0a1f0a', monitor: '#0a0f1f', warning: '#1f1000', critical: '#1f0000' }
  const statusBorder = { healthy: `${GREEN}44`, monitor: `${BLUE}44`, warning: `${UT_ORANGE}44`, critical: `${UT_RED}44` }

  function HealthGauge({ score }) {
    const c = score >= 85 ? GREEN : score >= 70 ? BLUE : score >= 50 ? UT_ORANGE : UT_RED
    const r = 36, circ = 2 * Math.PI * r
    const fill = ((100 - score) / 100) * circ
    return (
      <svg width="90" height="90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#2a1000" strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={c} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={fill}
          strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s' }} />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 18, fontWeight: 700, fill: c }}>{score}</text>
      </svg>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <LiveDot />
        <span style={{ fontSize: 12, color: GRAY }}>PHM system · updated {time}</span>
      </div>

      {data && (
        <>
          <div style={{ background: `linear-gradient(135deg, ${UT_DARK} 0%, #2a0800 100%)`, border: `1px solid ${UT_RED}44`, borderRadius: 12, padding: '1.5rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 24 }}>
            <HealthGauge score={data.plant_health_score} />
            <div>
              <div style={{ fontSize: 10, color: UT_YELLOW, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Overall plant health score</div>
              <div style={{ fontSize: 40, fontWeight: 700, color: WHITE }}>{data.plant_health_score}<span style={{ fontSize: 16, color: GRAY, fontWeight: 400 }}>/100</span></div>
              <div style={{ fontSize: 12, color: GRAY, marginTop: 4 }}>Composite PHM score — anomaly rate + sensor stability</div>
              <div style={{ fontSize: 11, color: UT_ORANGE, marginTop: 6 }}>Prognostics and Health Management (PHM) · DRDO/ISRO grade</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
            {Object.entries(data.machines).map(([machine, m]) => {
              const sc = statusColor[m.rul_status] || GRAY
              const sb = statusBg[m.rul_status] || UT_CARD
              const sbr = statusBorder[m.rul_status] || UT_BORDER
              const icons = { kiln: '🔥', ball_mill: '⚙️', cooler: '❄️' }
              return (
                <div key={machine} style={{ background: UT_CARD, border: `1px solid ${UT_BORDER}`, borderRadius: 12, padding: '1.1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 18 }}>{icons[machine]}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: WHITE, textTransform: 'capitalize' }}>{machine.replace('_', ' ')}</span>
                      </div>
                      <div style={{ fontSize: 11, color: GRAY }}>Health monitoring · last 30 min</div>
                    </div>
                    <HealthGauge score={m.health_score} />
                  </div>

                  <div style={{ background: sb, border: `1px solid ${sbr}`, borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: sc, fontWeight: 600, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Remaining useful life (RUL)</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: sc }}>{m.rul_hours} <span style={{ fontSize: 13, fontWeight: 400 }}>hours</span></div>
                    <div style={{ fontSize: 11, color: sc, marginTop: 2, textTransform: 'capitalize' }}>Status: {m.rul_status}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Anomaly score', value: m.anomaly_score },
                      { label: 'Stability score', value: m.stability_score },
                      { label: 'Anomaly rate', value: `${m.anomaly_rate}%` },
                      { label: 'Anomalies/30min', value: m.anomalies_30min },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#160800', borderRadius: 6, padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, color: '#666', marginBottom: 2 }}>{item.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: WHITE }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ background: `${UT_ORANGE}11`, border: `1px solid ${UT_ORANGE}33`, borderRadius: 10, padding: '1rem', marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: UT_YELLOW, marginBottom: 4 }}>What is PHM?</div>
            <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.7 }}>
              Prognostics and Health Management (PHM) is the same technology used by <span style={{ color: UT_ORANGE }}>DRDO</span> for missile and vehicle engine monitoring, and by <span style={{ color: UT_ORANGE }}>ISRO</span> for launch vehicle telemetry health assessment. This module computes a composite health score from anomaly rate and sensor stability, then estimates Remaining Useful Life (RUL).
            </div>
          </div>
        </>
      )}

      {!data && (
        <div style={{ textAlign: 'center', padding: '3rem', color: GRAY }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div>Loading PHM data...</div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState('Overview')
  const pages = { Overview: <Overview />, Alerts: <Alerts />, Forecast: <Forecast />, Health: <PHM /> }
  const navIcons = { Overview: '📡', Alerts: '🚨', Forecast: '🔮', Health: '🏥' }
  const navDesc = { Overview: 'Live plant status', Alerts: 'Active anomalies', Forecast: 'AI predictions', Health: 'PHM · RUL' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0500', fontFamily: 'system-ui, sans-serif' }}>

      {/* Sidebar */}
      <div style={{ width: 220, background: UT_DARK, borderRight: `1px solid ${UT_BORDER}`, padding: '1.25rem 1rem', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>

        <UltraTechLogo />

        <div style={{ background: UT_YELLOW, borderRadius: 6, padding: '5px 10px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: UT_DARK, letterSpacing: '0.05em' }}>MANIKGARH CEMENT WORKS</div>
        </div>

        <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Navigation</div>

        {Object.keys(pages).map(n => (
          <div key={n} onClick={() => setPage(n)} style={{
            padding: '9px 12px', borderRadius: 8, marginBottom: 4, cursor: 'pointer',
            background: page === n ? `${UT_RED}22` : 'transparent',
            border: page === n ? `1px solid ${UT_RED}55` : '1px solid transparent',
            borderLeft: page === n ? `3px solid ${UT_RED}` : '3px solid transparent',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{navIcons[n]}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: page === n ? 600 : 400, color: page === n ? WHITE : '#666' }}>{n}</div>
                <div style={{ fontSize: 10, color: '#444' }}>{navDesc[n]}</div>
              </div>
            </div>
          </div>
        ))}

        <div style={{ flex: 1 }}></div>

        <div style={{ borderTop: `1px solid ${UT_BORDER}`, paddingTop: 12, marginTop: 12 }}>
          <div style={{ fontSize: 10, color: '#444', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Model performance</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span style={{ color: '#666' }}>MAPE</span>
            <span style={{ color: GREEN, fontWeight: 600 }}>0.741%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span style={{ color: '#666' }}>Algorithm</span>
            <span style={{ color: UT_YELLOW, fontWeight: 600 }}>XGBoost</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#666' }}>Features</span>
            <span style={{ color: UT_ORANGE, fontWeight: 600 }}>24</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{navIcons[page]}</span>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: WHITE, margin: 0 }}>{page}</h1>
                <div style={{ fontSize: 12, color: GRAY, marginTop: 2 }}>{navDesc[page]}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, boxShadow: `0 0 6px ${GREEN}` }}></div>
                <span style={{ fontSize: 12, color: GREEN, fontWeight: 500 }}>System online</span>
              </div>
              <button
                onClick={() => window.open('http://localhost:8000/api/report', '_blank')}
                style={{ background: UT_YELLOW, color: UT_DARK, border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                📄 Download Shift Report
              </button>
            </div>
          </div>

          {pages[page]}
        </div>
      </div>
    </div>
  )
}
