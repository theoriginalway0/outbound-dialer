import { useState, useEffect } from 'react'

const MODE_LABELS = {
  mock: 'Mock (Demo)',
  twilio: 'Twilio',
  ringcentral: 'RingCentral',
  btcloudwork: 'BT Cloud Work',
}

const FIELD_LABELS = {
  RINGCENTRAL_SERVER: 'API Server URL',
  RINGCENTRAL_CLIENT_ID: 'Client ID',
  RINGCENTRAL_CLIENT_SECRET: 'Client Secret',
  RINGCENTRAL_JWT_TOKEN: 'JWT Token',
  RINGCENTRAL_FROM_NUMBER: 'From Number',
  TWILIO_ACCOUNT_SID: 'Account SID',
  TWILIO_AUTH_TOKEN: 'Auth Token',
  TWILIO_FROM_NUMBER: 'From Number',
  TWILIO_TWIML_URL: 'TwiML URL',
  TWILIO_STATUS_CALLBACK_URL: 'Status Callback URL',
}

const FIELD_PLACEHOLDERS = {
  RINGCENTRAL_SERVER: 'https://platform.ringcentral.com',
  RINGCENTRAL_CLIENT_ID: 'Your RingCentral app Client ID',
  RINGCENTRAL_CLIENT_SECRET: 'Your RingCentral app Client Secret',
  RINGCENTRAL_JWT_TOKEN: 'JWT credential from RingCentral developer portal',
  RINGCENTRAL_FROM_NUMBER: '+14155551234',
  TWILIO_ACCOUNT_SID: 'AC...',
  TWILIO_AUTH_TOKEN: 'Your Twilio Auth Token',
  TWILIO_FROM_NUMBER: '+14155551234',
  TWILIO_TWIML_URL: 'https://your-server.com/twiml',
  TWILIO_STATUS_CALLBACK_URL: 'https://your-server.com/api/calls/twilio-webhook',
}

const SECRET_FIELDS = new Set([
  'TWILIO_AUTH_TOKEN',
  'RINGCENTRAL_CLIENT_SECRET',
  'RINGCENTRAL_JWT_TOKEN',
])

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [mode, setMode] = useState('mock')
  const [modeFields, setModeFields] = useState({})
  const [config, setConfig] = useState({})
  const [editValues, setEditValues] = useState({})
  const [connected, setConnected] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    try {
      const res = await fetch('/api/settings/')
      const data = await res.json()
      setMode(data.dialer_mode)
      setModeFields(data.mode_fields)
      setConnected(data.connected)
      setConfig(data.config)
      // Initialize edit values with current values
      const edits = {}
      for (const [key, info] of Object.entries(data.config)) {
        edits[key] = info.is_set ? info.value : ''
      }
      setEditValues(edits)
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load settings.' })
    }
    setLoading(false)
  }

  function handleFieldChange(key, value) {
    setEditValues(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    try {
      const configPayload = {}
      const fields = modeFields[mode] || []
      for (const key of fields) {
        const val = editValues[key] || ''
        // Don't send masked values back
        if (!val.startsWith('*')) {
          configPayload[key] = val
        }
      }
      const res = await fetch('/api/settings/', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialer_mode: mode, config: configPayload }),
      })
      const data = await res.json()
      if (data.status === 'ok') {
        // Now apply without restart
        const applyRes = await fetch('/api/settings/apply', { method: 'POST' })
        const applyData = await applyRes.json()
        if (applyData.status === 'ok') {
          setMessage({ type: 'success', text: `Settings saved and applied! Dialer mode: ${MODE_LABELS[applyData.dialer_mode]}` })
        } else {
          setMessage({ type: 'error', text: `Settings saved but failed to apply: ${applyData.message}` })
        }
        setConnected(data.connected)
        loadSettings()
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save settings.' })
    }
    setSaving(false)
  }

  async function handleTestConnection() {
    setTesting(true)
    setMessage(null)
    try {
      const configPayload = {}
      const fields = modeFields[mode] || []
      for (const key of fields) {
        const val = editValues[key] || ''
        if (!val.startsWith('*')) {
          configPayload[key] = val
        }
      }
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialer_mode: mode, config: configPayload }),
      })
      const data = await res.json()
      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message,
      })
    } catch (e) {
      setMessage({ type: 'error', text: 'Connection test failed.' })
    }
    setTesting(false)
  }

  if (loading) {
    return <div className="card" style={{ padding: 40, textAlign: 'center' }}>Loading settings...</div>
  }

  const currentFields = modeFields[mode] || []

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`badge ${connected ? 'badge-active' : 'badge-draft'}`}>
            {connected ? 'Connected' : 'Not Configured'}
          </span>
        </div>
      </div>

      {message && (
        <div
          className="card"
          style={{
            borderLeft: `4px solid var(--${message.type === 'success' ? 'success' : 'error'})`,
            marginBottom: 16,
          }}
        >
          {message.text}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Dialer Provider</span>
        </div>

        <div className="form-group">
          <label>Provider</label>
          <select
            className="form-control"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            {Object.entries(MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {mode === 'btcloudwork' && (
          <div style={{
            background: '#eef6ff',
            border: '1px solid #c3ddf5',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
            color: '#014486',
            lineHeight: 1.6,
          }}>
            <strong>BT Cloud Work</strong> is powered by RingCentral. Use your RingCentral
            developer credentials below. Set up your app at{' '}
            <a href="https://developers.ringcentral.com/" target="_blank" rel="noreferrer"
              style={{ color: '#0176d3' }}>
              developers.ringcentral.com
            </a>
          </div>
        )}

        {mode === 'ringcentral' && (
          <div style={{
            background: '#eef6ff',
            border: '1px solid #c3ddf5',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
            color: '#014486',
            lineHeight: 1.6,
          }}>
            Set up your RingCentral app at{' '}
            <a href="https://developers.ringcentral.com/" target="_blank" rel="noreferrer"
              style={{ color: '#0176d3' }}>
              developers.ringcentral.com
            </a>
          </div>
        )}

        {mode === 'mock' && (
          <div style={{
            background: '#f0f0f0',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
            color: '#546e7a',
          }}>
            Mock mode simulates calls for testing — no credentials needed.
          </div>
        )}
      </div>

      {currentFields.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              {mode === 'btcloudwork' ? 'BT Cloud Work' : MODE_LABELS[mode]} Configuration
            </span>
          </div>

          {currentFields.map((field) => (
            <div className="form-group" key={field}>
              <label>{FIELD_LABELS[field] || field}</label>
              <input
                className="form-control"
                type={SECRET_FIELDS.has(field) ? 'password' : 'text'}
                placeholder={FIELD_PLACEHOLDERS[field] || ''}
                value={editValues[field] || ''}
                onChange={(e) => handleFieldChange(field, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save & Apply'}
        </button>
        {mode !== 'mock' && (
          <button className="btn btn-outline" onClick={handleTestConnection} disabled={testing}>
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
        )}
      </div>
    </div>
  )
}
