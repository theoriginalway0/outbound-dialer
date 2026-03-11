import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Manages a RingCentral WebRTC WebPhone session.
 * Falls back silently if not in RC/BT Cloud Work mode or if SIP provision fails.
 */
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
        // Fetch SIP credentials — fails silently if not in RC mode
        const res = await fetch('/api/webphone/sip-provision')
        if (!res.ok) return  // Not in RC mode, fall back to RingOut
        const sipData = await res.json()
        if (!mounted) return

        fromNumberRef.current = sipData._fromNumber || ''

        const { default: RCWebPhone } = await import('@ringcentral/web-phone')

        const webPhone = new RCWebPhone(sipData, {
          appKey: sipData._clientId,
          appName: 'OutboundDialer',
          appVersion: '1.0.0',
          enableMidLinesInSDP: true,
          audioHelper: { enabled: true, incoming: null, outgoing: null },
        })

        if (!mounted) {
          webPhone.userAgent.stop()
          return
        }

        webPhoneRef.current = webPhone

        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Registration timeout')), 30000)
          webPhone.userAgent.once('registered', () => { clearTimeout(timeout); resolve() })
          webPhone.userAgent.once('registrationFailed', (err) => { clearTimeout(timeout); reject(err) })
        })

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
        try { webPhoneRef.current.userAgent.stop() } catch {}
        webPhoneRef.current = null
      }
      setReady(false)
      sessionRef.current = null
    }
  }, [])

  const makeCall = useCallback(async (phoneNumber, { onRinging, onConnected, onEnded, onFailed } = {}) => {
    if (!webPhoneRef.current || !ready) throw new Error('WebPhone not ready')

    // Normalise to E.164 for UK numbers
    let num = phoneNumber.replace(/[\s\-().]/g, '')
    if (num.startsWith('00')) {
      num = '+' + num.slice(2)
    } else if (num.startsWith('0') && num.length <= 11) {
      num = '+44' + num.slice(1)
    } else if (!num.startsWith('+')) {
      num = '+' + num
    }

    const session = webPhoneRef.current.userAgent.invite(num, {
      fromNumber: fromNumberRef.current,
    })

    sessionRef.current = session
    setMuted(false)

    session.on('progress', () => onRinging?.())
    session.on('accepted', () => onConnected?.())
    session.on('bye', () => {
      sessionRef.current = null
      onEnded?.()
    })
    session.on('failed', (response, cause) => {
      sessionRef.current = null
      onFailed?.(cause || 'Call failed')
    })
    session.on('terminated', () => {
      if (sessionRef.current) {
        sessionRef.current = null
        onEnded?.()
      }
    })

    return session
  }, [ready])

  const hangup = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.terminate() } catch {}
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
