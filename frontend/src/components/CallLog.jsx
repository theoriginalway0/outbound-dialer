import { useState, useEffect } from 'react'
import { getCalls } from '../api'

export default function CallLog() {
  const [calls, setCalls] = useState([])
  const [filter, setFilter] = useState('')

  const load = async () => {
    const params = {}
    if (filter) params.disposition = filter
    const data = await getCalls(params)
    setCalls(data)
  }

  useEffect(() => { load() }, [filter])

  const formatDate = (d) => new Date(d).toLocaleString()
  const formatDuration = (s) => {
    if (s == null) return '-'
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div>
      <div className="page-header">
        <h1>Call Log</h1>
      </div>

      <div className="search-bar">
        <select className="form-control" style={{maxWidth: 180}} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Dispositions</option>
          <option value="answered">Answered</option>
          <option value="voicemail">Voicemail</option>
          <option value="no_answer">No Answer</option>
          <option value="busy">Busy</option>
          <option value="callback">Callback</option>
          <option value="not_interested">Not Interested</option>
        </select>
        <button className="btn btn-outline" onClick={load}>Refresh</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Duration</th>
                <th>Disposition</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {calls.length === 0 && (
                <tr><td colSpan={6} className="empty-state">No calls recorded yet</td></tr>
              )}
              {calls.map(c => (
                <tr key={c.id}>
                  <td style={{whiteSpace: 'nowrap'}}>{formatDate(c.started_at)}</td>
                  <td>
                    {c.contact ? `${c.contact.first_name} ${c.contact.last_name}` : '-'}
                  </td>
                  <td>{c.contact?.phone || '-'}</td>
                  <td>{formatDuration(c.duration_seconds)}</td>
                  <td>
                    {c.disposition
                      ? <span className={`badge badge-${c.disposition}`}>{c.disposition.replace('_', ' ')}</span>
                      : <span className="badge badge-pending">{c.status}</span>
                    }
                  </td>
                  <td style={{maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    {c.notes || '-'}
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
