import { useState, useRef } from 'react'
import { importCampaign } from '../api'

const APP_FIELDS = [
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'company', label: 'Company', required: false },
  { key: 'title', label: 'Title', required: false },
]

export default function CampaignImportModal({ onClose, onImported }) {
  const [step, setStep] = useState(1)
  const [campaignName, setCampaignName] = useState('')
  const [file, setFile] = useState(null)
  const [csvHeaders, setCsvHeaders] = useState([])
  const [previewRows, setPreviewRows] = useState([])
  const [columnMap, setColumnMap] = useState({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setError('')

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length === 0) {
        setError('CSV file appears to be empty')
        return
      }

      const headers = parseCSVLine(lines[0])
      setCsvHeaders(headers)

      const preview = []
      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const values = parseCSVLine(lines[i])
        const row = {}
        headers.forEach((h, idx) => { row[h] = values[idx] || '' })
        preview.push(row)
      }
      setPreviewRows(preview)

      const autoMap = {}
      APP_FIELDS.forEach(({ key }) => {
        const match = headers.find(h =>
          h.toLowerCase().replace(/[_\s]/g, '') === key.replace(/_/g, '')
        )
        if (match) autoMap[key] = match
      })
      setColumnMap(autoMap)
    }
    reader.readAsText(f)
  }

  const parseCSVLine = (line) => {
    const result = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (ch === '"') {
          inQuotes = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',') {
          result.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    result.push(current.trim())
    return result
  }

  const goToMapping = () => {
    if (!file || !campaignName) return
    if (csvHeaders.length === 0) {
      setError('Could not parse CSV headers')
      return
    }
    setStep(2)
  }

  const updateMapping = (appField, csvCol) => {
    setColumnMap(prev => {
      const next = { ...prev }
      if (csvCol) {
        next[appField] = csvCol
      } else {
        delete next[appField]
      }
      return next
    })
  }

  const canSubmit = columnMap.phone && (columnMap.first_name || columnMap.last_name)

  const handleSubmit = async () => {
    setImporting(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('campaign_name', campaignName)
      formData.append('column_map', JSON.stringify(columnMap))
      const res = await importCampaign(formData)
      setResult(res)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <h2>Import Campaign from CSV</h2>

        {error && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 'var(--radius)', marginBottom: 12, fontSize: 13 }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            <div className="form-group">
              <label>Campaign Name</label>
              <input
                className="form-control"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                placeholder="e.g. Q1 Salesforce Outreach"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>CSV File</label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="form-control"
                style={{ padding: 6 }}
              />
            </div>
            {previewRows.length > 0 && (
              <div className="form-group">
                <label>Preview ({previewRows.length} rows shown)</label>
                <div style={{ overflow: 'auto', maxHeight: 160, border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                  <table>
                    <thead>
                      <tr>{csvHeaders.map(h => <th key={h} style={{ whiteSpace: 'nowrap' }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i}>
                          {csvHeaders.map(h => <td key={h} style={{ whiteSpace: 'nowrap' }}>{row[h]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="form-actions">
              <button className="btn btn-primary" onClick={goToMapping} disabled={!file || !campaignName}>
                Next: Map Columns
              </button>
              <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Map your CSV columns to contact fields. Phone is required, plus at least one name field.
            </p>
            {APP_FIELDS.map(({ key, label, required }) => (
              <div className="form-group" key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ width: 100, marginBottom: 0, flexShrink: 0 }}>
                  {label}{required ? ' *' : ''}
                </label>
                <select
                  className="form-control"
                  value={columnMap[key] || ''}
                  onChange={e => updateMapping(key, e.target.value)}
                >
                  <option value="">-- skip --</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
            {previewRows.length > 0 && (
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>Mapped Preview</label>
                <div style={{ overflow: 'auto', maxHeight: 120, border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                  <table>
                    <thead>
                      <tr>
                        {APP_FIELDS.filter(f => columnMap[f.key]).map(f => (
                          <th key={f.key} style={{ whiteSpace: 'nowrap' }}>{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i}>
                          {APP_FIELDS.filter(f => columnMap[f.key]).map(f => (
                            <td key={f.key} style={{ whiteSpace: 'nowrap' }}>{row[columnMap[f.key]]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit || importing}>
                {importing ? 'Importing...' : 'Import Campaign'}
              </button>
              <button className="btn btn-outline" onClick={() => setStep(1)} disabled={importing}>Back</button>
              <button className="btn btn-outline" onClick={onClose} disabled={importing}>Cancel</button>
            </div>
          </>
        )}

        {step === 3 && result && (
          <>
            <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: 12, borderRadius: 'var(--radius)', marginBottom: 16, fontSize: 14 }}>
              Campaign "{result.campaign_name}" created successfully!
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div className="stat-card" style={{ padding: 12 }}>
                <div className="stat-value" style={{ fontSize: 24 }}>{result.contacts_created}</div>
                <div className="stat-label">Contacts Created</div>
              </div>
              <div className="stat-card" style={{ padding: 12 }}>
                <div className="stat-value" style={{ fontSize: 24 }}>{result.contacts_existing}</div>
                <div className="stat-label">Existing Matched</div>
              </div>
              <div className="stat-card" style={{ padding: 12 }}>
                <div className="stat-value" style={{ fontSize: 24 }}>{result.total_rows}</div>
                <div className="stat-label">Total Rows</div>
              </div>
              <div className="stat-card" style={{ padding: 12 }}>
                <div className="stat-value" style={{ fontSize: 24, color: result.errors.length > 0 ? 'var(--error)' : undefined }}>{result.errors.length}</div>
                <div className="stat-label">Errors</div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="form-group">
                <label>Errors</label>
                <div style={{ maxHeight: 120, overflow: 'auto', fontSize: 12, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 8 }}>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ color: 'var(--error)', marginBottom: 2 }}>
                      Row {e.row}: {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => { onImported(); onClose(); }}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
