/*
 * Task ordering and due-date labels. Pure helpers shared by the planner.
 * Open work comes first, overdue before today, then upcoming, then undated;
 * completed rows settle at the bottom.
 */

import { formatDateShort, toISODate } from './analytics.js'

function tomorrowISO(ref = new Date()) {
  return toISODate(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1))
}

export function taskDueMeta(task, ref = new Date()) {
  if (!task?.due_date) return { label: 'No due date', overdue: false, isToday: false }
  const today = toISODate(ref)
  if (task.due_date < today) {
    return { label: `Overdue · ${formatDateShort(task.due_date)}`, overdue: true, isToday: false }
  }
  if (task.due_date === today) return { label: 'Today', overdue: false, isToday: true }
  if (task.due_date === tomorrowISO(ref)) {
    return { label: 'Tomorrow', overdue: false, isToday: false }
  }
  return { label: formatDateShort(task.due_date), overdue: false, isToday: false }
}

function openRank(task, today) {
  if (!task.due_date) return 3
  if (task.due_date < today) return 0
  if (task.due_date === today) return 1
  return 2
}

export function sortTasks(tasks, ref = new Date()) {
  const today = toISODate(ref)
  return [...tasks].sort((a, b) => {
    if (Boolean(a.done) !== Boolean(b.done)) return a.done ? 1 : -1
    if (a.done) {
      return String(b.completed_at || '').localeCompare(String(a.completed_at || ''))
    }
    const rank = openRank(a, today) - openRank(b, today)
    if (rank !== 0) return rank
    const due = String(a.due_date || '9999-12-31').localeCompare(
      String(b.due_date || '9999-12-31'),
    )
    if (due !== 0) return due
    return String(a.created_at || '').localeCompare(String(b.created_at || ''))
  })
}

export function splitTasks(tasks, ref = new Date()) {
  const sorted = sortTasks(tasks, ref)
  return {
    open: sorted.filter((task) => !task.done),
    done: sorted.filter((task) => task.done),
  }
}
