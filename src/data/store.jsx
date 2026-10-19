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
  units: [],
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
      updateNote: (id, patch) => mutate(() => db.updateNote(id, patch)),
      deleteNote: (id) => mutate(() => db.deleteNote(id)),
      createTransaction: (row) => mutate(() => db.addTransaction(row)),
      updateTransaction: (id, patch) => mutate(() => db.updateTransaction(id, patch)),
      deleteTransaction: (id) => mutate(() => db.deleteTransaction(id)),
      createBudget: (row) => mutate(() => db.addBudget(row)),
      updateBudget: (id, patch) => mutate(() => db.updateBudget(id, patch)),
      deleteBudget: (id) => mutate(() => db.deleteBudget(id)),
      createCourse: (row) => mutate(() => db.addCourse(row)),
      updateCourse: (id, patch) => mutate(() => db.updateCourse(id, patch)),
      deleteCourse: (id) => mutate(() => db.deleteCourse(id)),
      createCourseUnit: (row) => mutate(() => db.addCourseUnit(row)),
      updateCourseUnit: (id, patch) => mutate(() => db.updateCourseUnit(id, patch)),
      deleteCourseUnit: (id) => mutate(() => db.deleteCourseUnit(id)),
      completeCourseUnit: (id, done) =>
        mutate(async () => {
          const unit = data.units.find((item) => item.id === id)
          await db.updateCourseUnit(id, { done })
          const course = unit ? data.courses.find((item) => item.id === unit.course_id) : null
          if (course) {
            const total = Number(course.total_units) || 0
            const next = Math.max(0, (Number(course.completed_units) || 0) + (done ? 1 : -1))
            await db.updateCourse(course.id, {
              completed_units: total > 0 ? Math.min(next, total) : next,
            })
          }
        }),
      createSession: (row) => mutate(() => db.addSession(row)),
      updateSession: (id, patch) => mutate(() => db.updateSession(id, patch)),
      deleteSession: (id) => mutate(() => db.deleteSession(id)),
      createPlanEntry: (row) => mutate(() => db.addPlanEntry(row)),
      updatePlanEntry: (id, patch) => mutate(() => db.updatePlanEntry(id, patch)),
      deletePlanEntry: (id) => mutate(() => db.deletePlanEntry(id)),
      togglePlanEntry: (id, done) => mutate(() => db.updatePlanEntry(id, { done })),
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
