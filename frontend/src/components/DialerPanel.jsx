import { useState, useEffect, useRef, useCallback } from "react"
import { initiateCall, hangupCall, endCall, updateCallStatus, getNextCampaignContact, skipCampaignContact } from "../api"
import { useWebPhone } from "../hooks/useWebPhone"
import { Phone, PhoneOff, ChevronDown, ChevronUp, Mic, MicOff, SkipForward } from "lucide-react"

const STATES = { IDLE: "idle", CALLING: "calling", RINGING: "ringing", IN_PROGRESS: "in_progress", WRAP_UP: "wrap_up" }
const cls = (...a) => a.filter(Boolean).join(" ")

export default function DialerPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [dialerState, setDialerState] = useState(STATES.IDLE)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [currentCall, setCurrentCall] = useState(null)
  const [currentContact, setCurrentContact] = useState(null)
  const [timer, setTimer] = useState(0)
  const [disposition, setDisposition] = useState("")
  const [notes, setNotes] = useState("")
  const [campaignMode, setCampaignMode] = useState(null)
  const wsRef = useRef(null)
  const timerRef = useRef(null)
  const { ready: webPhoneReady, makeCall: webPhoneMakeCall, hangup: webPhoneHangup, muted, toggleMute } = useWebPhone()

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
    const connect = () => {
      const ws = new WebSocket(proto + "//" + window.location.host + "/ws/call-status")
      wsRef.current = ws
      ws.onclose = () => setTimeout(connect, 3000)
    }
    connect()
    return () => wsRef.current?.close()
  }, [])

  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.onmessage = (ev) => {
        const msg = JSON.parse(ev.data)
        if (msg.type === "call_status") handleStatusUpdate(msg.status, msg.data)
      }
    }
  }, [currentCall])

  useEffect(() => {
    if (dialerState === STATES.IN_PROGRESS) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [dialerState])

  const handleStatusUpdate = useCallback((status, data) => {
    if (status === "ringing") setDialerState(STATES.RINGING)
    else if (status === "in_progress") { setDialerState(STATES.IN_PROGRESS); setTimer(0) }
    else if (status === "completed" || status === "failed") {
      clearInterval(timerRef.current)
      setDialerState(STATES.WRAP_UP)
      if (data?.disposition) setDisposition(data.disposition)
    }
  }, [])

  const fmt = (s) => Math.floor(s/60).toString().padStart(2,"0") + ":" + (s%60).toString().padStart(2,"0")

  const handleCall = async (contact = null) => {
    setCollapsed(false)
    const c = contact || currentContact
    if (!c && !phoneNumber) return
    setDialerState(STATES.CALLING); setTimer(0); setDisposition(""); setNotes("")
    if (c) { setCurrentContact(c); setPhoneNumber(c.phone) }
    const num = c?.phone || phoneNumber
    try {
      const payload = { campaign_id: campaignMode?.campaignId || null, webrtc: webPhoneReady }
      if (c?.id) payload.contact_id = c.id; else payload.phone_number = num
      const call = await initiateCall(payload)
      setCurrentCall(call)
      if (webPhoneReady) {
        await webPhoneMakeCall(num, {
          onRinging: () => setDialerState(STATES.RINGING),
          onConnected: () => { setDialerState(STATES.IN_PROGRESS); setTimer(0) },
          onEnded: async () => {
            clearInterval(timerRef.current); setDialerState(STATES.WRAP_UP)
            try { await updateCallStatus(call.id, { status: "completed" }) } catch {}
          },
          onFailed: async () => {
            setDialerState(STATES.WRAP_UP)
            try { await updateCallStatus(call.id, { status: "failed" }) } catch {}
            setDisposition("no_answer")
          },
        })
      }
    } catch (err) { alert(err.message); setDialerState(STATES.IDLE) }
  }

  const handleHangup = async () => {
    webPhoneHangup()
    try { await hangupCall(currentCall.id) } catch {}
    setDialerState(STATES.WRAP_UP)
  }

  const handleSaveDisposition = async () => {
    if (!currentCall || !disposition) return
    try {
      await endCall(currentCall.id, { disposition, notes })
      setDialerState(STATES.IDLE); setCurrentCall(null); setTimer(0)
      if (campaignMode) await advanceToNext()
      else { setCurrentContact(null); setPhoneNumber("") }
    } catch (err) { alert(err.message) }
  }

  const advanceToNext = async () => {
    try {
      const next = await getNextCampaignContact(campaignMode.campaignId)
      setCurrentContact(next.contact); setPhoneNumber(next.contact.phone)
      setTimeout(() => handleCall(next.contact), 2000)
    } catch {
      setCampaignMode(null); setCurrentContact(null); setPhoneNumber("")
      alert("Campaign complete! No more contacts.")
    }
  }

  const handleSkip = async () => {
    if (!campaignMode || !currentContact) return
    if (currentCall && ![STATES.IDLE, STATES.WRAP_UP].includes(dialerState))
      await hangupCall(currentCall.id).catch(() => {})
    try {
      await skipCampaignContact(campaignMode.campaignId, currentContact.id)
      setDialerState(STATES.IDLE); setCurrentCall(null); setTimer(0)
      await advanceToNext()
    } catch (err) { alert(err.message) }
  }

  useEffect(() => {
    const onDial = (e) => {
      const { contact, campaignId, campaignName, autoCall } = e.detail
      if (campaignId) setCampaignMode({ campaignId, campaignName })
      if (contact) {
        setCurrentContact(contact); setPhoneNumber(contact.phone); setCollapsed(false)
        if (autoCall) handleCall(contact)
      }
    }
    const onStart = async (e) => {
      const { campaignId, campaignName } = e.detail
      setCampaignMode({ campaignId, campaignName }); setCollapsed(false)
      try {
        const next = await getNextCampaignContact(campaignId)
        setCurrentContact(next.contact); setPhoneNumber(next.contact.phone)
        setTimeout(() => handleCall(next.contact), 1000)
      } catch { alert("No pending contacts."); setCampaignMode(null) }
    }
    window.addEventListener("dialer:call", onDial)
    window.addEventListener("dialer:startCampaign", onStart)
    return () => {
      window.removeEventListener("dialer:call", onDial)
      window.removeEventListener("dialer:startCampaign", onStart)
    }
  }, [campaignMode])

  const isOnCall = [STATES.CALLING, STATES.RINGING, STATES.IN_PROGRESS].includes(dialerState)
  const grad = isOnCall ? "from-green-600 to-green-700" : dialerState === STATES.WRAP_UP ? "from-amber-500 to-amber-600" : "from-blue-600 to-blue-700"
  const inp = "w-full h-9 px-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"

  return (
    <div className={cls("fixed bottom-5 right-5 z-50 w-[360px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_8px_40px_rgba(0,0,0,0.18)]", isOnCall && "dialer-active-ring")}>
      <div className={cls("flex items-center justify-between px-4 py-3 rounded-t-2xl cursor-pointer select-none bg-gradient-to-r", grad)} onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-white" />
          <span className="text-sm font-semibold text-white">
            {dialerState === STATES.IDLE ? "Dialer" : dialerState === STATES.WRAP_UP ? "Wrap Up" : "On Call"}
          </span>
          {campaignMode && <span className="text-xs text-white/70">· {campaignMode.campaignName}</span>}
        </div>
        <div className="flex items-center gap-2">
          {webPhoneReady && (
            <span className="flex items-center gap-1 text-xs text-green-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />WebRTC
            </span>
          )}
          {collapsed ? <ChevronUp className="w-4 h-4 text-white/80" /> : <ChevronDown className="w-4 h-4 text-white/80" />}
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {campaignMode && (
            <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">{campaignMode.campaignName}</span>
              <button onClick={() => { setCampaignMode(null); if (dialerState === STATES.IDLE) { setCurrentContact(null); setPhoneNumber("") } }} className="text-xs text-blue-600 hover:underline">Pause</button>
            </div>
          )}

          {currentContact && (
            <div className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{currentContact.first_name} {currentContact.last_name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{currentContact.phone}</div>
              {currentContact.company && <div className="text-xs text-slate-400">{currentContact.company}</div>}
            </div>
          )}

          {isOnCall && (
            <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {dialerState === STATES.CALLING && "Initiating..."}
                  {dialerState === STATES.RINGING && "Ringing..."}
                  {dialerState === STATES.IN_PROGRESS && "Connected"}
                </span>
              </div>
              {dialerState === STATES.IN_PROGRESS && (
                <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">{fmt(timer)}</span>
              )}
            </div>
          )}

          {dialerState === STATES.IDLE && (
            <>
              <input type="tel" className={inp} placeholder="Enter phone number..." value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
              <div className="grid grid-cols-3 gap-1.5">
                {["1","2","3","4","5","6","7","8","9","*","0","#"].map(k => (
                  <button key={k} onClick={() => setPhoneNumber(p => p + k)} className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-base active:scale-95 transition-all">{k}</button>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center justify-center gap-3 pt-1">
            {dialerState === STATES.IDLE && (
              <button onClick={() => handleCall()} className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-500/30 active:scale-95 transition-all">
                <Phone className="w-6 h-6" />
              </button>
            )}
            {isOnCall && (
              <>
                {dialerState === STATES.IN_PROGRESS && webPhoneReady && (
                  <button onClick={toggleMute} className={cls("w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95", muted ? "bg-red-500 text-white shadow-lg shadow-red-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700")}>
                    {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
                <button onClick={handleHangup} className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-all">
                  <PhoneOff className="w-6 h-6" />
                </button>
                {campaignMode && (
                  <button onClick={handleSkip} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-all active:scale-95">
                    <SkipForward className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>

          {dialerState === STATES.WRAP_UP && (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Call Disposition</div>
              <select className={inp} value={disposition} onChange={e => setDisposition(e.target.value)}>
                <option value="">Select outcome...</option>
                <option value="answered">Answered</option>
                <option value="voicemail">Voicemail</option>
                <option value="no_answer">No Answer</option>
                <option value="busy">Busy</option>
                <option value="callback">Callback</option>
                <option value="not_interested">Not Interested</option>
              </select>
              <textarea className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              <div className="flex gap-2">
                <button onClick={handleSaveDisposition} disabled={!disposition} className="flex-1 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors">
                  {campaignMode ? "Save & Next" : "Save"}
                </button>
                {campaignMode && (
                  <button onClick={handleSkip} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm transition-colors">Skip</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
