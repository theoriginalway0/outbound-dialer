import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Wifi, WifiOff } from "lucide-react"

const MODE_LABELS = { mock: "Mock (Demo)", twilio: "Twilio", ringcentral: "RingCentral", btcloudwork: "BT Cloud Work" }
const FIELD_LABELS = {
  RINGCENTRAL_SERVER: "API Server URL", RINGCENTRAL_CLIENT_ID: "Client ID",
  RINGCENTRAL_CLIENT_SECRET: "Client Secret", RINGCENTRAL_JWT_TOKEN: "JWT Token",
  RINGCENTRAL_FROM_NUMBER: "From Number", TWILIO_ACCOUNT_SID: "Account SID",
  TWILIO_AUTH_TOKEN: "Auth Token", TWILIO_FROM_NUMBER: "From Number",
  TWILIO_TWIML_URL: "TwiML URL", TWILIO_STATUS_CALLBACK_URL: "Status Callback URL",
}
const FIELD_PLACEHOLDERS = {
  RINGCENTRAL_SERVER: "https://platform.ringcentral.com", RINGCENTRAL_CLIENT_ID: "Your Client ID",
  RINGCENTRAL_CLIENT_SECRET: "Your Client Secret", RINGCENTRAL_JWT_TOKEN: "JWT credential",
  RINGCENTRAL_FROM_NUMBER: "+14155551234", TWILIO_ACCOUNT_SID: "AC...",
  TWILIO_AUTH_TOKEN: "Your Twilio Auth Token", TWILIO_FROM_NUMBER: "+14155551234",
}
const SECRET_FIELDS = new Set(["TWILIO_AUTH_TOKEN", "RINGCENTRAL_CLIENT_SECRET", "RINGCENTRAL_JWT_TOKEN"])

const inp = "w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
const lbl = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [mode, setMode] = useState("mock")
  const [modeFields, setModeFields] = useState({})
  const [editValues, setEditValues] = useState({})
  const [connected, setConnected] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings/")
      const data = await res.json()
      setMode(data.dialer_mode); setModeFields(data.mode_fields); setConnected(data.connected)
      const edits = {}
      for (const [key, info] of Object.entries(data.config)) edits[key] = info.is_set ? info.value : ""
      setEditValues(edits)
    } catch { setMessage({ type: "error", text: "Failed to load settings." }) }
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true); setMessage(null)
    try {
      const configPayload = {}
      for (const key of (modeFields[mode] || [])) {
        const val = editValues[key] || ""
        if (!val.startsWith("*")) configPayload[key] = val
      }
      const res = await fetch("/api/settings/", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dialer_mode: mode, config: configPayload }) })
      const data = await res.json()
      if (data.status === "ok") {
        const applyRes = await fetch("/api/settings/apply", { method: "POST" })
        const applyData = await applyRes.json()
        setMessage({ type: applyData.status === "ok" ? "success" : "error", text: applyData.status === "ok" ? "Settings saved and applied! Mode: " + MODE_LABELS[applyData.dialer_mode] : "Saved but failed to apply: " + applyData.message })
        setConnected(data.connected); loadSettings()
      }
    } catch { setMessage({ type: "error", text: "Failed to save settings." }) }
    setSaving(false)
  }

  async function handleTest() {
    setTesting(true); setMessage(null)
    try {
      const configPayload = {}
      for (const key of (modeFields[mode] || [])) { const val = editValues[key] || ""; if (!val.startsWith("*")) configPayload[key] = val }
      const res = await fetch("/api/settings/test-connection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dialer_mode: mode, config: configPayload }) })
      const data = await res.json()
      setMessage({ type: data.success ? "success" : "error", text: data.message })
    } catch { setMessage({ type: "error", text: "Connection test failed." }) }
    setTesting(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading settings...</div>

  const currentFields = modeFields[mode] || []

  return (
    <div className="space-y-5 max-w-2xl">
      {message && (
        <div className={"flex items-start gap-3 px-4 py-3 rounded-xl border text-sm " + (message.type === "success" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300")}>
          {message.type === "success" ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Provider card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Dialer Provider</h3>
          <div className={"flex items-center gap-1.5 text-xs font-medium " + (connected ? "text-green-600 dark:text-green-400" : "text-slate-400")}>
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {connected ? "Connected" : "Not configured"}
          </div>
        </div>
        <div>
          <label className={lbl}>Provider</label>
          <select className={inp} value={mode} onChange={e => setMode(e.target.value)}>
            {Object.entries(MODE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {(mode === "btcloudwork" || mode === "ringcentral") && (
          <div className="mt-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
            {mode === "btcloudwork" ? <><strong>BT Cloud Work</strong> is powered by RingCentral. Use your RingCentral developer credentials.</> : "Set up your RingCentral app at developers.ringcentral.com"}
          </div>
        )}
        {mode === "mock" && (
          <div className="mt-4 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-500 dark:text-slate-400">
            Mock mode simulates calls for testing — no credentials needed.
          </div>
        )}
      </div>

      {/* Config card */}
      {currentFields.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {mode === "btcloudwork" ? "BT Cloud Work" : MODE_LABELS[mode]} Configuration
          </h3>
          <div className="space-y-4">
            {currentFields.map(field => (
              <div key={field}>
                <label className={lbl}>{FIELD_LABELS[field] || field}</label>
                <input
                  className={inp}
                  type={SECRET_FIELDS.has(field) ? "password" : "text"}
                  placeholder={FIELD_PLACEHOLDERS[field] || ""}
                  value={editValues[field] || ""}
                  onChange={e => setEditValues(prev => ({ ...prev, [field]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="h-9 px-4 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium transition-colors">
          {saving ? "Saving..." : "Save & Apply"}
        </button>
        {mode !== "mock" && (
          <button onClick={handleTest} disabled={testing} className="h-9 px-4 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
            {testing ? "Testing..." : "Test Connection"}
          </button>
        )}
      </div>
    </div>
  )
}
