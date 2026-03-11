import { useState, useEffect, useRef, useCallback } from 'react'
import { initiateCall, hangupCall, endCall, updateCallStatus, getNextCampaignContact, skipCampaignContact } from '../api'
import { useWebPhone } from '../hooks/useWebPhone'

const STATES = { IDLE: 'idle', CALLING: 'calling', RINGING: 'ringing', IN_PROGRESS: 'in_progress', WRAP_UP: 'wrap_up' }

export default function DialerPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [dialerState, setDialerState] = useState(STATES.IDLE)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [currentCall, setCurrentCall] = useState(null)
  const [currentContact, setCurrentContact] = useState(null)
  const [timer, setTimer] = useState(0)
  const [disposition, setDisposition] = useState('')
  const [notes, setNotes] = useState('')
  const [prefilledDisposition, setPrefilledDisposition] = useState(null)

  // Campaign mode
  const [campaignMode, setCampaignMode] = useState(null) // { campaignId, campaignName }

  const wsRef = useRef(null)
  const timerRef = useRef(null)

  const { ready: webPhoneReady, makeCall: webPhoneMakeCall, hangup: webPhoneHangup, muted, toggleMute } = useWebPhone()

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/call-status`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.type === 'call_status' && currentCall && msg.call_id === currentCall.id) {
        handleStatusUpdate(msg.status, msg.data)
      }
    }

    ws.onclose = () => {
      // Reconnect after a delay — onmessage will be re-assigned by the other useEffect
      setTimeout(() => {
        if (wsRef.current === ws) {
          const newWs = new WebSocket(`${protocol}//${window.location.host}/ws/call-status`)
          newWs.onclose = ws.onclose
          wsRef.current = newWs
        }
      }, 3000)
    }

    return () => { ws.close() }
  }, [])

  // Update WS handler when currentCall changes
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.type === 'call_status') {
          handleStatusUpdate(msg.status, msg.data)
        }
      }
    }
  }, [currentCall])

  // Timer
  useEffect(() => {
    if (dialerState === STATES.IN_PROGRESS) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [dialerState])

  const handleStatusUpdate = useCallback((status, data) => {
    if (status === 'ringing') {
      setDialerState(STATES.RINGING)
    } else if (status === 'in_progress') {
      setDialerState(STATES.IN_PROGRESS)
      setTimer(0)
    } else if (status === 'completed' || status === 'failed') {
      if (timerRef.current) clearInterval(timerRef.current)
      setDialerState(STATES.WRAP_UP)
      if (data?.disposition) {
        setPrefilledDisposition(data.disposition)
        setDisposition(data.disposition)
      }
    }
  }, [])

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleKeypadPress = (key) => {
    setPhoneNumber(prev => prev + key)
  }

  const handleCall = async (contact = null) => {
    setCollapsed(false)
    const targetContact = contact || currentContact
    if (!targetContact && !phoneNumber) return

    setDialerState(STATES.CALLING)
    setTimer(0)
    setDisposition('')
    setNotes('')
    setPrefilledDisposition(null)

    if (targetContact) {
      setCurrentContact(targetContact)
      setPhoneNumber(targetContact.phone)
    }

    const dialNumber = targetContact?.phone || phoneNumber

    try {
      const payload = {
        campaign_id: campaignMode?.campaignId || null,
        webrtc: webPhoneReady,
      }
      if (targetContact?.id) {
        payload.contact_id = targetContact.id
      } else {
        payload.phone_number = dialNumber
      }
      const call = await initiateCall(payload)
      setCurrentCall(call)

      if (webPhoneReady) {
        await webPhoneMakeCall(dialNumber, {
          onRinging: () => setDialerState(STATES.RINGING),
          onConnected: () => { setDialerState(STATES.IN_PROGRESS); setTimer(0) },
          onEnded: async () => {
            if (timerRef.current) clearInterval(timerRef.current)
            setDialerState(STATES.WRAP_UP)
            try { await updateCallStatus(call.id, { status: 'completed' }) } catch {}
          },
          onFailed: async () => {
            setDialerState(STATES.WRAP_UP)
            try { await updateCallStatus(call.id, { status: 'failed' }) } catch {}
            setPrefilledDisposition('no_answer')
            setDisposition('no_answer')
          },
        })
      }
    } catch (err) {
      alert(err.message)
      setDialerState(STATES.IDLE)
    }
  }

  const handleHangup = async () => {
    if (!currentCall) return
    webPhoneHangup()
    try {
      await hangupCall(currentCall.id)
    } catch (err) {
      console.error('Hangup error:', err)
    }
    setDialerState(STATES.WRAP_UP)
  }

  const handleSaveDisposition = async () => {
    if (!currentCall || !disposition) return
    try {
      await endCall(currentCall.id, { disposition, notes })
      setDialerState(STATES.IDLE)
      setCurrentCall(null)
      setTimer(0)

      // Campaign auto-advance
      if (campaignMode) {
        await advanceToNext()
      } else {
        setCurrentContact(null)
        setPhoneNumber('')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const advanceToNext = async () => {
    if (!campaignMode) return
    try {
      const next = await getNextCampaignContact(campaignMode.campaignId)
      setCurrentContact(next.contact)
      setPhoneNumber(next.contact.phone)
      // Auto-dial after brief pause
      setTimeout(() => handleCall(next.contact), 2000)
    } catch {
      // No more contacts
      setCampaignMode(null)
      setCurrentContact(null)
      setPhoneNumber('')
      alert('Campaign complete! No more contacts to dial.')
    }
  }

  const handleSkip = async () => {
    if (!campaignMode || !currentContact) return

    // If a call is active, hang up first
    if (currentCall && dialerState !== STATES.IDLE && dialerState !== STATES.WRAP_UP) {
      await hangupCall(currentCall.id).catch(() => {})
    }

    try {
      await skipCampaignContact(campaignMode.campaignId, currentContact.id)
      setDialerState(STATES.IDLE)
      setCurrentCall(null)
      setTimer(0)
      await advanceToNext()
    } catch (err) {
      alert(err.message)
    }
  }

  const handlePauseCampaign = () => {
    setCampaignMode(null)
    if (dialerState === STATES.IDLE) {
      setCurrentContact(null)
      setPhoneNumber('')
    }
  }

  // Expose methods for other components via window events
  useEffect(() => {
    const handleDialEvent = (e) => {
      const { contact, campaignId, campaignName } = e.detail
      if (campaignId) {
        setCampaignMode({ campaignId, campaignName })
      }
      if (contact) {
        setCurrentContact(contact)
        setPhoneNumber(contact.phone)
        setCollapsed(false)
        if (e.detail.autoCall) {
          handleCall(contact)
        }
      }
    }

    const handleStartCampaign = async (e) => {
      const { campaignId, campaignName } = e.detail
      setCampaignMode({ campaignId, campaignName })
      setCollapsed(false)
      try {
        const next = await getNextCampaignContact(campaignId)
        setCurrentContact(next.contact)
        setPhoneNumber(next.contact.phone)
        setTimeout(() => handleCall(next.contact), 1000)
      } catch {
        alert('No pending contacts in this campaign.')
        setCampaignMode(null)
      }
    }

    window.addEventListener('dialer:call', handleDialEvent)
    window.addEventListener('dialer:startCampaign', handleStartCampaign)
    return () => {
      window.removeEventListener('dialer:call', handleDialEvent)
      window.removeEventListener('dialer:startCampaign', handleStartCampaign)
    }
  }, [campaignMode])

  const isActive = dialerState !== STATES.IDLE

  return (
    <div className="dialer-panel">
      <div className="dialer-header" onClick={() => setCollapsed(!collapsed)}>
        <h3>
          {isActive ? (dialerState === STATES.WRAP_UP ? 'Wrap Up' : 'On Call') : 'Dialer'}
          {campaignMode && <span style={{opacity: 0.7, marginLeft: 8, fontSize: 11}}>Campaign</span>}
          {webPhoneReady && <span style={{opacity: 0.7, marginLeft: 8, fontSize: 10, color: '#4caf50'}}>● WebRTC</span>}
        </h3>
        <button className="dialer-toggle">{collapsed ? '+' : '-'}</button>
      </div>

      <div className={`dialer-body${collapsed ? ' collapsed' : ''}`}>
        {/* Campaign bar */}
        {campaignMode && (
          <div className="dialer-campaign-bar">
            <span>{campaignMode.campaignName}</span>
            <button className="btn btn-sm btn-outline" onClick={handlePauseCampaign}>Pause</button>
          </div>
        )}

        {/* Contact info */}
        {currentContact && (
          <div className="dialer-contact">
            <div className="name">{currentContact.first_name} {currentContact.last_name}</div>
            <div className="phone">{currentContact.phone}</div>
            {currentContact.company && <div className="company">{currentContact.company}</div>}
          </div>
        )}

        {/* Status display */}
        {dialerState !== STATES.IDLE && dialerState !== STATES.WRAP_UP && (
          <div className="dialer-status">
            <div className={`status-text ${dialerState}`}>
              {dialerState === STATES.CALLING && 'Initiating...'}
              {dialerState === STATES.RINGING && 'Ringing...'}
              {dialerState === STATES.IN_PROGRESS && 'Connected'}
            </div>
            {dialerState === STATES.IN_PROGRESS && (
              <div className="dialer-timer">{formatTime(timer)}</div>
            )}
          </div>
        )}

        {/* Idle state: keypad + phone input */}
        {dialerState === STATES.IDLE && (
          <>
            <div className="phone-input-row">
              <input
                type="tel"
                className="form-control"
                placeholder="Phone number..."
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
              />
            </div>
            <div className="keypad">
              {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                <button key={key} className="keypad-btn" onClick={() => handleKeypadPress(key)}>
                  {key}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="dialer-actions">
          {dialerState === STATES.IDLE && (
            <button className="btn-call-lg call" onClick={() => handleCall()} title="Call">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </button>
          )}
          {(dialerState === STATES.CALLING || dialerState === STATES.RINGING || dialerState === STATES.IN_PROGRESS) && (
            <>
              {dialerState === STATES.IN_PROGRESS && webPhoneReady && (
                <button
                  className={`btn btn-sm ${muted ? 'btn-primary' : 'btn-outline'}`}
                  onClick={toggleMute}
                  title={muted ? 'Unmute' : 'Mute'}
                  style={{ marginRight: 8 }}
                >
                  {muted ? 'Unmute' : 'Mute'}
                </button>
              )}
              <button className="btn-call-lg hangup" onClick={handleHangup} title="Hang Up">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 010-1.36C3.69 8.68 7.65 7 12 7s8.31 1.68 11.71 4.72c.18.18.29.44.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 00-2.67-1.85.93.93 0 01-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                </svg>
              </button>
            </>
          )}
          {campaignMode && dialerState !== STATES.WRAP_UP && (
            <button className="btn btn-sm btn-outline" onClick={handleSkip}>Skip</button>
          )}
        </div>

        {/* Wrap-up / Disposition form */}
        {dialerState === STATES.WRAP_UP && (
          <div className="disposition-form">
            <h4>Call Disposition</h4>
            <div className="form-group">
              <select
                className="form-control"
                value={disposition}
                onChange={e => setDisposition(e.target.value)}
              >
                <option value="">Select outcome...</option>
                <option value="answered">Answered</option>
                <option value="voicemail">Voicemail</option>
                <option value="no_answer">No Answer</option>
                <option value="busy">Busy</option>
                <option value="callback">Callback</option>
                <option value="not_interested">Not Interested</option>
              </select>
            </div>
            <div className="form-group">
              <textarea
                className="form-control"
                placeholder="Notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleSaveDisposition} disabled={!disposition}>
                {campaignMode ? 'Save & Next' : 'Save'}
              </button>
              {campaignMode && (
                <button className="btn btn-outline" onClick={handleSkip}>Skip</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
