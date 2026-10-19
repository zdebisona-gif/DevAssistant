import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const HIDDEN_KEY = 'zeni.privacy.hidden'
const PrivacyContext = createContext(null)

/*
 * A per-device display preference: when hidden, balances and debt amounts render as a
 * mask and are left out of the context sent to Gemini. It is not synced — hiding on
 * this device does not change what another device shows.
 */
export function PrivacyProvider({ children }) {
  const [hidden, setHiddenState] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(HIDDEN_KEY)
      .then((raw) => setHiddenState(raw === '1'))
      .finally(() => setReady(true))
  }, [])

  const setHidden = useCallback((next) => {
    setHiddenState(Boolean(next))
    AsyncStorage.setItem(HIDDEN_KEY, next ? '1' : '0').catch(() => {})
  }, [])

  const toggle = useCallback(() => {
    setHiddenState((prev) => {
      AsyncStorage.setItem(HIDDEN_KEY, prev ? '0' : '1').catch(() => {})
      return !prev
    })
  }, [])

  const value = useMemo(() => ({ ready, hidden, setHidden, toggle }), [ready, hidden, setHidden, toggle])

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider')
  return ctx
}
