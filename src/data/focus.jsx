import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'zeni.focus'
const FocusContext = createContext(null)

/*
 * A single running focus session, persisted so it survives navigation and restarts.
 * Records `startedAt` (not a countdown) so elapsed time stays correct across sleeps.
 */
export function FocusProvider({ children }) {
  const [session, setSession] = useState(null)
  const [tick, setTick] = useState(Date.now())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          try {
            setSession(JSON.parse(raw))
          } catch {
            /* ignore */
          }
        }
      })
      .finally(() => setReady(true))
  }, [])

  useEffect(() => {
    if (!session) return undefined
    const id = setInterval(() => setTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [session])

  const persist = useCallback((next) => {
    setSession(next)
    setTick(Date.now())
    if (next) AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {})
    else AsyncStorage.removeItem(KEY).catch(() => {})
  }, [])

  const start = useCallback(
    ({ courseId = null, title = null } = {}) => {
      persist({ startedAt: Date.now(), courseId, title })
    },
    [persist],
  )

  const stop = useCallback(() => {
    if (!session) return null
    const hours = Math.max(0.1, Math.round(((Date.now() - session.startedAt) / 3600000) * 10) / 10)
    const result = { ...session, hours }
    persist(null)
    return result
  }, [session, persist])

  const cancel = useCallback(() => persist(null), [persist])

  const value = useMemo(
    () => ({
      ready,
      session,
      active: Boolean(session),
      elapsedMs: session ? tick - session.startedAt : 0,
      start,
      stop,
      cancel,
    }),
    [ready, session, tick, start, stop, cancel],
  )

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
}

export function useFocus() {
  const ctx = useContext(FocusContext)
  if (!ctx) throw new Error('useFocus must be used within FocusProvider')
  return ctx
}

export function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
