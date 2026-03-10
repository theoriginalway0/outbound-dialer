import { useState, useEffect } from 'react'
import { getDashboardStats, getRecentCalls } from '../api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentCalls, setRecentCalls] = useState([])

  const load = async () => {
    const [s, r] = await Promise.all([getDashboardStats(), getRecentCalls()])
    setStats(s)
    setRecentCalls(r)
  }

  useEffect(() => { load() }, [])

  const formatDate = (d) => new Date(d).toLocaleString()
  const formatDuration = (s) => {
    if (s == null) return '-'
    return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`
  }

  const connectRate = stats
    ? (stats.disposition_breakdown.answered || 0) /
      Math.max(1, stats.calls_today) * 100
    : 0

  const maxDisposition = stats
    ? Math.max(1, ...Object.values(stats.disposition_breakdown))
    : 1

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-outline" onClick={load}>Refresh</button>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{stats?.calls_today ?? '-'}</div>
          <div className="stat-label">Calls Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats ? formatDuration(Math.round(stats.avg_duration_seconds)) : '-'}</div>
          <div className="stat-label">Avg Duration</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{color: 'var(--success)'}}>{stats ? `${Math.round(connectRate)}%` : '-'}</div>
          <div className="stat-label">Connect Rate</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.disposition_breakdown.callback ?? 0}</div>
          <div className="stat-label">Callbacks</div>
        </div>
      </div>

      {stats && Object.keys(stats.disposition_breakdown).length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Disposition Breakdown</div>
          </div>
          <div className="disposition-chart">
            {Object.entries(stats.disposition_breakdown).map(([key, count]) => (
              <div className="disposition-row" key={key}>
                <div className="disposition-label">{key.replace('_', ' ')}</div>
                <div className="disposition-bar-wrap">
                  <div
                    className={`disposition-bar ${key}`}
                    style={{width: `${(count / maxDisposition) * 100}%`}}
                  />
                </div>
                <div className="disposition-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent Calls</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Contact</th>
                <th>Duration</th>
                <th>Disposition</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.length === 0 && (
                <tr><td colSpan={4} className="empty-state">No calls yet today</td></tr>
              )}
              {recentCalls.map(c => (
                <tr key={c.id}>
                  <td style={{whiteSpace: 'nowrap'}}>{formatDate(c.started_at)}</td>
                  <td>{c.contact ? `${c.contact.first_name} ${c.contact.last_name}` : '-'}</td>
                  <td>{formatDuration(c.duration_seconds)}</td>
                  <td>
                    {c.disposition
                      ? <span className={`badge badge-${c.disposition}`}>{c.disposition.replace('_',' ')}</span>
                      : <span className="badge badge-pending">{c.status}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
