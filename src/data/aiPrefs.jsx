import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ENABLED_KEY = 'zeni.ai.enabled'
const USAGE_KEY = 'zeni.ai.usage'
const DOMAINS_KEY = 'zeni.ai.domains'
const AiPrefsContext = createContext(null)

/* Notes default to aggregates so note labels stay on-device until the user opts in. */
const DEFAULT_DOMAINS = {
  finance: 'labels',
  planner: 'labels',
  learning: 'labels',
  projects: 'labels',
  notes: 'aggregates',
}

const DOMAIN_VALUES = ['off', 'aggregates', 'labels']

function normalizeDomains(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_DOMAINS }
  const next = { ...DEFAULT_DOMAINS }
  for (const [domain, value] of Object.entries(raw)) {
    if (DOMAIN_VALUES.includes(value)) next[domain] = value
  }
  return next
}

/*
 * Gemini is opt-in and OFF by default. This provider holds the user's choice plus the
 * last known usage reading (remaining free requests today), both persisted locally.
 */
export function AiPrefsProvider({ children }) {
  const [enabled, setEnabledState] = useState(false)
  const [usage, setUsage] = useState(null)
  const [domains, setDomains] = useState(() => ({ ...DEFAULT_DOMAINS }))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(ENABLED_KEY),
      AsyncStorage.getItem(USAGE_KEY),
      AsyncStorage.getItem(DOMAINS_KEY),
    ])
      .then(([rawEnabled, rawUsage, rawDomains]) => {
        setEnabledState(rawEnabled === '1')
        if (rawUsage) {
          try {
            setUsage(JSON.parse(rawUsage))
          } catch {
            /* ignore */
          }
        }
        if (rawDomains) {
          try {
            setDomains(normalizeDomains(JSON.parse(rawDomains)))
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

  const setDomainPref = useCallback((domain, value) => {
    if (!DOMAIN_VALUES.includes(value)) return
    setDomains((prev) => {
      const next = { ...prev, [domain]: value }
      AsyncStorage.setItem(DOMAINS_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  const enabledFor = useCallback(
    (domain) => Boolean(enabled) && domains[domain] !== 'off',
    [enabled, domains],
  )

  const value = useMemo(
    () => ({ ready, enabled, setEnabled, usage, recordUsage, domains, setDomainPref, enabledFor }),
    [ready, enabled, setEnabled, usage, recordUsage, domains, setDomainPref, enabledFor],
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
