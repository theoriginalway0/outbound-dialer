import { useState, useEffect, useRef, useCallback } from 'react'

export function useWebPhone() {
  const [ready, setReady] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [muted, setMuted] = useState(false)
  const webPhoneRef = useRef(null)
  const sessionRef = useRef(null)
  const fromNumberRef = useRef('')

  useEffect(() => {
    let mounted = true
    setInitializing(true)

    const init = async () => {
      try {
        const res = await fetch('/api/webphone/sip-provision')
        if (!res.ok) return
        const data = await res.json()
        if (!mounted) return

        fromNumberRef.current = data._fromNumber || ''
        // RingCentral provision returns sipInfo as an array; v2 SDK expects one object
        const sipInfo = Array.isArray(data.sipInfo) ? data.sipInfo[0] : data.sipInfo

        const { default: WebPhone } = await import('ringcentral-web-phone')
        const webPhone = new WebPhone({ sipInfo })

        if (!mounted) {
          try { await webPhone.dispose() } catch {}
          return
        }

        webPhoneRef.current = webPhone
        await webPhone.start()

        if (mounted) {
          setReady(true)
          console.log('[WebPhone] Registered — WebRTC ready')
        }
      } catch (err) {
        console.warn('[WebPhone] Init failed, falling back to RingOut:', err.message)
      } finally {
        if (mounted) setInitializing(false)
      }
    }

    init()

    return () => {
      mounted = false
      if (webPhoneRef.current) {
        try { webPhoneRef.current.dispose() } catch {}
        webPhoneRef.current = null
      }
      setReady(false)
      sessionRef.current = null
    }
  }, [])

  const makeCall = useCallback(async (phoneNumber, { onRinging, onConnected, onEnded, onFailed } = {}) => {
    if (!webPhoneRef.current || !ready) throw new Error('WebPhone not ready')

    // Normalise to E.164 (handles UK numbers starting with 0 or 00)
    let num = phoneNumber.replace(/[\s\-().]/g, '')
    if (num.startsWith('00')) num = '+' + num.slice(2)
    else if (num.startsWith('0') && num.length <= 11) num = '+44' + num.slice(1)
    else if (!num.startsWith('+')) num = '+' + num

    // For BT/Vodafone accounts, webPhone.call() remains pending until answered.
    // Subscribe to 'outboundCall' first so we get the session object immediately
    // (while the phone is still ringing) to allow hangup before answer.
    const onOutbound = (callSession) => {
      sessionRef.current = callSession
      setMuted(false)
      onRinging?.()

      callSession.once('answered', () => onConnected?.())
      callSession.once('disposed', () => {
        sessionRef.current = null
        onEnded?.()
      })
      callSession.once('failed', () => {
        sessionRef.current = null
        onFailed?.()
      })
    }

    webPhoneRef.current.once('outboundCall', onOutbound)

    try {
      await webPhoneRef.current.call(num, fromNumberRef.current || undefined)
    } catch (err) {
      webPhoneRef.current.off('outboundCall', onOutbound)
      throw err
    }
  }, [ready])

  const hangup = useCallback(async () => {
    if (sessionRef.current) {
      try { await sessionRef.current.hangup() } catch {}
      sessionRef.current = null
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (!sessionRef.current) return
    const newMuted = !muted
    try {
      if (newMuted) sessionRef.current.mute()
      else sessionRef.current.unmute()
      setMuted(newMuted)
    } catch (err) {
      console.warn('[WebPhone] Mute toggle failed:', err)
    }
  }, [muted])

  return { ready, initializing, makeCall, hangup, muted, toggleMute }
}
