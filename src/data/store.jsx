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
import { taggedNet } from '../lib/accounts.js'
import { useAuth } from './auth.jsx'

const EMPTY = {
  budgets: [],
  transactions: [],
  notes: [],
  courses: [],
  modules: [],
  lessons: [],
  sessions: [],
  planner: [],
  projects: [],
  penalties: [],
  accounts: [],
  debts: [],
  tasks: [],
  sleepLogs: [],
  sleepCreditEvents: [],
}

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { uid } = useAuth()
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!uid) {
      setData(EMPTY)
      setError(null)
      setLoading(false)
      return
    }
    setError(null)
    try {
      setData(await db.loadAll())
    } catch (cause) {
      setError(cause)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    reload()
  }, [reload])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && uid) reload()
    })
    return () => sub.remove()
  }, [reload, uid])

  const mutate = useCallback(
    async (operation) => {
      if (!uid) throw new Error('Sign in to change records.')
      const result = await operation()
      await reload()
      return result
    },
    [reload, uid],
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
      createModule: (row) => mutate(() => db.addModule(row)),
      updateModule: (id, patch) => mutate(() => db.updateModule(id, patch)),
      deleteModule: (id) => mutate(() => db.deleteModule(id)),
      createLesson: (row) => mutate(() => db.addLesson(row)),
      updateLesson: (id, patch) => mutate(() => db.updateLesson(id, patch)),
      deleteLesson: (id) => mutate(() => db.deleteLesson(id)),
      toggleLesson: (id, done) => mutate(() => db.updateLesson(id, { done })),
      /* Recency only: patch locally and write in the background, so opening a lesson
         never waits on a network round-trip. */
      touchLesson: (id) => {
        if (!uid) return
        const opened_at = new Date().toISOString()
        setData((prev) => ({
          ...prev,
          lessons: prev.lessons.map((lesson) =>
            lesson.id === id ? { ...lesson, opened_at } : lesson,
          ),
        }))
        db.updateLesson(id, { opened_at }).catch(() => {})
      },
      createCourseTree: (tree) =>
        mutate(async () => {
          const course = await db.addCourse({
            name: tree.name,
            description: tree.description ?? '',
            weekly_target_hours: tree.weekly_target_hours ?? 0,
          })
          let modulePosition = 0
          for (const mod of tree.modules ?? []) {
            const saved = await db.addModule({
              course_id: course.id,
              title: mod.title,
              description: mod.description ?? '',
              position: modulePosition,
            })
            modulePosition += 1
            let lessonPosition = 0
            for (const lesson of mod.lessons ?? []) {
              await db.addLesson({
                module_id: saved.id,
                title: lesson.title,
                content: lesson.content ?? '',
                position: lessonPosition,
              })
              lessonPosition += 1
            }
          }
          return course
        }),
      createSession: (row) => mutate(() => db.addSession(row)),
      updateSession: (id, patch) => mutate(() => db.updateSession(id, patch)),
      deleteSession: (id) => mutate(() => db.deleteSession(id)),
      createPlanEntry: (row) => mutate(() => db.addPlanEntry(row)),
      updatePlanEntry: (id, patch) => mutate(() => db.updatePlanEntry(id, patch)),
      deletePlanEntry: (id) => mutate(() => db.deletePlanEntry(id)),
      togglePlanEntry: (id, done) => mutate(() => db.updatePlanEntry(id, { done })),
      createProject: (row) => mutate(() => db.addProject(row)),
      updateProject: (id, patch) => mutate(() => db.updateProject(id, patch)),
      deleteProject: (id) => mutate(() => db.deleteProject(id)),
      createAccount: (row) => mutate(() => db.addAccount(row)),
      updateAccount: (id, patch) => mutate(() => db.updateAccount(id, patch)),
      deleteAccount: (id) => mutate(() => db.deleteAccount(id)),
      /* The balance is derived, so an adjustment moves the stored opening balance. */
      adjustOpeningBalance: (id, delta) => {
        const account = data.accounts.find((row) => row.id === id)
        const next = (Number(account?.opening_balance) || 0) + delta
        return mutate(() => db.updateAccount(id, { opening_balance: next }))
      },
      /* Reconcile: rewrite the opening balance so the live balance equals what the user sees. */
      reconcileAccount: (id, displayed) =>
        mutate(() => db.updateAccount(id, { opening_balance: displayed - taggedNet(data.transactions, id) })),
      createDebt: (row) => mutate(() => db.addDebt(row)),
      updateDebt: (id, patch) => mutate(() => db.updateDebt(id, patch)),
      deleteDebt: (id) => mutate(() => db.deleteDebt(id)),
      settleDebt: (id, settled = true) =>
        mutate(() =>
          db.updateDebt(id, { settled, settled_at: settled ? new Date().toISOString() : null }),
        ),
      createTask: (row) => mutate(() => db.addTask(row)),
      updateTask: (id, patch) => mutate(() => db.updateTask(id, patch)),
      deleteTask: (id) => mutate(() => db.deleteTask(id)),
      toggleTask: (id, done) =>
        mutate(() =>
          db.updateTask(id, { done, completed_at: done ? new Date().toISOString() : null }),
        ),
      createSleepLog: (row) => mutate(() => db.addSleepLog(row)),
      updateSleepLog: (id, patch) => mutate(() => db.updateSleepLog(id, patch)),
      deleteSleepLog: (id) => mutate(() => db.deleteSleepLog(id)),
      createPenalty: (row) => mutate(() => db.addPenalty(row)),
      /* Irreversible: removes every record for this account, then reloads to empty. */
      deleteAllData: () => mutate(() => db.deleteAllData()),
      atonePenalty: (penalty) =>
        mutate(async () => {
          await db.updatePenalty(penalty.id, {
            atonement: penalty.atonement,
            atoned: true,
            atoned_at: new Date().toISOString(),
          })
          await db.addNote({
            title: `Atonement: ${penalty.project_title}`,
            body: penalty.atonement,
            tag: 'Personal',
          })
        }),
    }),
    [data, loading, error, reload, mutate, uid],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
