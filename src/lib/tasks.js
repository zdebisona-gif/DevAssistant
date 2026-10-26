/*
 * Task ordering and due-date labels. Pure helpers shared by the planner.
 * Priority tasks lead the open list; within each group, overdue comes before
 * today, then upcoming, then undated. Completed rows settle at the bottom.
 */

import { formatDateShort, toISODate } from './analytics.js'
import { formatClock12 } from './format.js'

function tomorrowISO(ref = new Date()) {
  return toISODate(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 1))
}

function clockMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''))
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

export function taskDueMeta(task, ref = new Date()) {
  const clock = formatClock12(task?.due_time)
  const time = clock ? ` · ${clock}` : ''
  if (!task?.due_date) return { label: 'No due date', overdue: false, isToday: false }
  const today = toISODate(ref)
  if (task.due_date < today) {
    return {
      label: `Overdue · ${formatDateShort(task.due_date)}${time}`,
      overdue: true,
      isToday: false,
    }
  }
  if (task.due_date === today) {
    const dueClock = clockMinutes(task.due_time)
    const nowClock = ref.getHours() * 60 + ref.getMinutes()
    const late = dueClock !== null && nowClock > dueClock
    return {
      label: `${late ? 'Overdue · Today' : 'Today'}${time}`,
      overdue: late,
      isToday: true,
    }
  }
  if (task.due_date === tomorrowISO(ref)) {
    return { label: `Tomorrow${time}`, overdue: false, isToday: false }
  }
  return { label: `${formatDateShort(task.due_date)}${time}`, overdue: false, isToday: false }
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
    const priority = Number(Boolean(b.priority)) - Number(Boolean(a.priority))
    if (priority !== 0) return priority
    const rank = openRank(a, today) - openRank(b, today)
    if (rank !== 0) return rank
    const due = String(a.due_date || '9999-12-31').localeCompare(
      String(b.due_date || '9999-12-31'),
    )
    if (due !== 0) return due
    const time = String(a.due_time || '').localeCompare(String(b.due_time || ''))
    if (time !== 0) return time
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
