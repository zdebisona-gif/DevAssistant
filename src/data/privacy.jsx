import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const HIDDEN_KEY = 'zeni.privacy.hidden'
const ACCOUNTS_HIDDEN_KEY = 'zeni.privacy.accountsHidden'
const PrivacyContext = createContext(null)

/*
 * Per-device display preferences. `hidden` is the master switch: it masks account
 * balances, debt amounts and leaves those figures out of the context sent to Gemini.
 * `accountsHidden` is narrower: it masks only account balances and the accounts total,
 * while debts, spending and budgets stay visible. The master switch still wins.
 */
export function PrivacyProvider({ children }) {
  const [hidden, setHiddenState] = useState(false)
  const [accountsHidden, setAccountsHiddenState] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(HIDDEN_KEY),
      AsyncStorage.getItem(ACCOUNTS_HIDDEN_KEY),
    ])
      .then(([rawHidden, rawAccountsHidden]) => {
        setHiddenState(rawHidden === '1')
        setAccountsHiddenState(rawAccountsHidden === '1')
      })
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

  const setAccountsHidden = useCallback((next) => {
    setAccountsHiddenState(Boolean(next))
    AsyncStorage.setItem(ACCOUNTS_HIDDEN_KEY, next ? '1' : '0').catch(() => {})
  }, [])

  const toggleAccounts = useCallback(() => {
    setAccountsHiddenState((prev) => {
      AsyncStorage.setItem(ACCOUNTS_HIDDEN_KEY, prev ? '0' : '1').catch(() => {})
      return !prev
    })
  }, [])

  const accountMoneyHidden = hidden || accountsHidden

  const value = useMemo(
    () => ({
      ready,
      hidden,
      setHidden,
      toggle,
      accountsHidden,
      setAccountsHidden,
      toggleAccounts,
      accountMoneyHidden,
    }),
    [
      ready,
      hidden,
      setHidden,
      toggle,
      accountsHidden,
      setAccountsHidden,
      toggleAccounts,
      accountMoneyHidden,
    ],
  )

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider')
  return ctx
}
