import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ENABLED_KEY = 'zeni.ai.enabled'
const USAGE_KEY = 'zeni.ai.usage'
const AiPrefsContext = createContext(null)

/*
 * Gemini is opt-in and OFF by default. This provider holds the user's choice plus the
 * last known usage reading (remaining free requests today), both persisted locally.
 */
export function AiPrefsProvider({ children }) {
  const [enabled, setEnabledState] = useState(false)
  const [usage, setUsage] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(ENABLED_KEY), AsyncStorage.getItem(USAGE_KEY)])
      .then(([rawEnabled, rawUsage]) => {
        setEnabledState(rawEnabled === '1')
        if (rawUsage) {
          try {
            setUsage(JSON.parse(rawUsage))
          } catch {
            /* ignore */
          }
        }
      })
      .finally(() => setReady(true))
  }, [])

  const setEnabled = useCallback((next) => {
    setEnabledState(Boolean(next))
    AsyncStorage.setItem(ENABLED_KEY, next ? '1' : '0').catch(() => {})
  }, [])

  const recordUsage = useCallback((info) => {
    if (!info) return
    const next = { ...info, day: new Date().toISOString().slice(0, 10) }
    setUsage(next)
    AsyncStorage.setItem(USAGE_KEY, JSON.stringify(next)).catch(() => {})
  }, [])

  const value = useMemo(
    () => ({ ready, enabled, setEnabled, usage, recordUsage }),
    [ready, enabled, setEnabled, usage, recordUsage],
  )

  return <AiPrefsContext.Provider value={value}>{children}</AiPrefsContext.Provider>
}

export function useAiPrefs() {
  const ctx = useContext(AiPrefsContext)
  if (!ctx) throw new Error('useAiPrefs must be used within AiPrefsProvider')
  return ctx
}

/** Today's remaining AI requests, or null if we have no reading for today. */
export function remainingToday(usage) {
  if (!usage) return null
  if (usage.day !== new Date().toISOString().slice(0, 10)) return null
  return typeof usage.remaining === 'number' ? usage.remaining : null
}
