/*
 * Single source of truth for live data.
 *
 * All tables are small, so the provider loads them together, exposes the rows,
 * and re-loads after any mutation or when the app returns to the foreground.
 * Screens read via useData() and never talk to Supabase directly.
 */

import { AppState } from 'react-native'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as db from '../lib/db.js'

const EMPTY = {
  budgets: [],
  transactions: [],
  notes: [],
  courses: [],
  sessions: [],
  planner: [],
}

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      setData(await db.loadAll())
    } catch (cause) {
      setError(cause)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload()
    })
    return () => sub.remove()
  }, [reload])

  const mutate = useCallback(
    async (operation) => {
      const result = await operation()
      await reload()
      return result
    },
    [reload],
  )

  const value = useMemo(
    () => ({
      data,
      loading,
      error,
      reload,
      createNote: (row) => mutate(() => db.addNote(row)),
      createTransaction: (row) => mutate(() => db.addTransaction(row)),
      createBudget: (row) => mutate(() => db.addBudget(row)),
      createCourse: (row) => mutate(() => db.addCourse(row)),
      createSession: (row) => mutate(() => db.addSession(row)),
      createPlanEntry: (row) => mutate(() => db.addPlanEntry(row)),
      togglePlanEntry: (id, done) => mutate(() => db.setPlanEntryDone(id, done)),
      deleteNote: (id) => mutate(() => db.removeNote(id)),
    }),
    [data, loading, error, reload, mutate],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
