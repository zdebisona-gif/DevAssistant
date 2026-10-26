import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import {
  DEFAULT_REMINDERS,
  buildBudgetAlertCandidates,
  buildReminderPlan,
  mergeReminderPrefs,
  monthKeyOf,
  pruneBudgetAlerts,
  spendByCategory,
} from '../lib/reminders.js'
import {
  cancelAllOwnedNotifications,
  configureNotifications,
  getPermissionStatus,
  requestPermission,
  sendBudgetAlert,
  sendTestNotification,
  syncScheduledNotifications,
} from '../lib/notifications.js'
import { useAuth } from './auth.jsx'
import { useData } from './store.jsx'

const PREFS_KEY = 'zeni.reminders.prefs'
const BUDGET_ALERTS_KEY = 'zeni.reminders.budgetAlerts'

const RemindersContext = createContext(null)

export function RemindersProvider({ children }) {
  const { uid, loading: authLoading } = useAuth()
  const { data, loading, loadedFor } = useData()
  const [prefs, setPrefs] = useState(DEFAULT_REMINDERS)
  const [ready, setReady] = useState(false)
  const [permission, setPermission] = useState('unknown')
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const budgetAlertsRef = useRef(new Set())
  const previousSpendRef = useRef(null)
  const spendUidRef = useRef(null)
  const spendMonthRef = useRef(null)
  const operationsRef = useRef(Promise.resolve())

  const enqueue = useCallback((operation) => {
    const next = operationsRef.current.then(operation, operation)
    operationsRef.current = next.catch(() => {})
    return next
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([AsyncStorage.getItem(PREFS_KEY), AsyncStorage.getItem(BUDGET_ALERTS_KEY)])
      .then(([rawPrefs, rawAlerts]) => {
        if (!active) return
        if (rawPrefs) {
          try {
            setPrefs(mergeReminderPrefs(JSON.parse(rawPrefs)))
          } catch {
            setPrefs(DEFAULT_REMINDERS)
          }
        }
        if (rawAlerts) {
          try {
            budgetAlertsRef.current = new Set(pruneBudgetAlerts(JSON.parse(rawAlerts)))
          } catch {
            budgetAlertsRef.current = new Set()
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  const refreshPermission = useCallback(async () => {
    const status = await getPermissionStatus().catch(() => 'unknown')
    setPermission(status)
    return status
  }, [])

  useEffect(() => {
    configureNotifications().catch(() => {})
    const timer = setTimeout(() => {
      refreshPermission()
    }, 0)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshPermission()
    })
    return () => {
      clearTimeout(timer)
      sub.remove()
    }
  }, [refreshPermission])

  const updatePrefs = useCallback((updater) => {
    setPrefs((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const merged = mergeReminderPrefs(next)
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(merged)).catch(() => {})
      return merged
    })
  }, [])

  const setEnabled = useCallback(
    async (next) => {
      if (!next) {
        updatePrefs((prev) => ({ ...prev, enabled: false }))
        setSyncError(null)
        await enqueue(() => cancelAllOwnedNotifications().catch(() => {}))
        return 'disabled'
      }
      const status = await requestPermission().catch(() => 'denied')
      setPermission(status)
      if (status !== 'granted') {
        updatePrefs((prev) => ({ ...prev, enabled: false }))
        return status
      }
      updatePrefs((prev) => ({ ...prev, enabled: true }))
      return status
    },
    [enqueue, updatePrefs],
  )

  const syncNow = useCallback(() => {
    if (!prefs.enabled || permission !== 'granted') return Promise.resolve()
    return enqueue(async () => {
      setSyncing(true)
      try {
        const plan = buildReminderPlan({ data, prefs })
        await syncScheduledNotifications(plan)
        setLastSyncedAt(new Date())
        setSyncError(null)
      } catch {
        setSyncError('Could not update reminders on this device.')
      } finally {
        setSyncing(false)
      }
    })
  }, [data, enqueue, prefs, permission])

  const sendTest = useCallback(async () => {
    const status = permission === 'granted' ? permission : await requestPermission().catch(() => 'denied')
    setPermission(status)
    if (status !== 'granted') return status
    try {
      await sendTestNotification()
      return 'scheduled'
    } catch {
      return 'error'
    }
  }, [permission])

  useEffect(() => {
    if (!ready || authLoading) return
    if (!uid || !prefs.enabled || permission === 'denied' || permission === 'unavailable') {
      enqueue(() => cancelAllOwnedNotifications().catch(() => {}))
    }
  }, [ready, authLoading, uid, prefs.enabled, permission, enqueue])

  useEffect(() => {
    if (!ready || authLoading || !uid || loading || loadedFor !== uid) return
    if (!prefs.enabled || permission !== 'granted') return
    const timer = setTimeout(() => {
      syncNow()
    }, 700)
    return () => clearTimeout(timer)
  }, [ready, authLoading, uid, loading, loadedFor, prefs, permission, syncNow])

  useEffect(() => {
    if (!ready || authLoading || !uid || loading || loadedFor !== uid) return
    const current = spendByCategory(data.transactions)
    const month = monthKeyOf()

    if (spendUidRef.current !== uid || spendMonthRef.current !== month) {
      spendUidRef.current = uid
      spendMonthRef.current = month
      previousSpendRef.current = current
      return
    }

    const previous = previousSpendRef.current
    previousSpendRef.current = current
    if (!previous || !prefs.enabled || !prefs.money.budgets.enabled) return
    if (permission !== 'granted') return

    const candidates = buildBudgetAlertCandidates({
      budgets: data.budgets,
      transactions: data.transactions,
      previousSpend: previous,
    }).filter((candidate) => !budgetAlertsRef.current.has(candidate.key))
    if (!candidates.length) return

    let active = true
    const deliver = async () => {
      const delivered = []
      for (const candidate of candidates) {
        try {
          await sendBudgetAlert(candidate)
          delivered.push(candidate.key)
        } catch {}
      }
      if (!active || !delivered.length) return
      const keys = pruneBudgetAlerts([...budgetAlertsRef.current, ...delivered])
      budgetAlertsRef.current = new Set(keys)
      AsyncStorage.setItem(BUDGET_ALERTS_KEY, JSON.stringify(keys)).catch(() => {})
    }
    deliver()
    return () => {
      active = false
    }
  }, [
    ready,
    authLoading,
    uid,
    loading,
    loadedFor,
    data.transactions,
    data.budgets,
    prefs.enabled,
    prefs.money.budgets.enabled,
    permission,
  ])

  useEffect(() => {
    if (authLoading) return
    if (!uid) {
      spendUidRef.current = null
      spendMonthRef.current = null
      previousSpendRef.current = null
      budgetAlertsRef.current = new Set()
      AsyncStorage.removeItem(BUDGET_ALERTS_KEY).catch(() => {})
    }
  }, [uid, authLoading])

  const value = useMemo(
    () => ({
      ready,
      prefs,
      permission,
      enabled: prefs.enabled,
      setEnabled,
      updatePrefs,
      sendTest,
      refreshPermission,
      syncNow,
      syncing,
      syncError,
      lastSyncedAt,
    }),
    [
      ready,
      prefs,
      permission,
      setEnabled,
      updatePrefs,
      sendTest,
      refreshPermission,
      syncNow,
      syncing,
      syncError,
      lastSyncedAt,
    ],
  )

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>
}

export function useReminders() {
  const ctx = useContext(RemindersContext)
  if (!ctx) throw new Error('useReminders must be used within RemindersProvider')
  return ctx
}
