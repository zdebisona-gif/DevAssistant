/*
 * Weekly projects (Phase 7): pure helpers for deadlines, credits and the penalty ledger.
 * No React, no network — the screen derives everything from raw rows through these.
 *
 * A project is a one-off deliverable with a deadline. A submission is assessed by Gemini
 * (or self-assessed) against the brief and criteria. Failing, or being marked missed,
 * forfeits credits and locks new projects until an atonement note is written.
 */

import { formatDateShort, toISODate } from './analytics.js'

export const DEFAULT_CREDITS = 100
export const FORFEIT_CREDITS = 10

export const PROJECT_STATUSES = ['active', 'passed', 'failed', 'missed']

/** Remaining credits: the starting balance minus every forfeit on record. */
export function creditBalance(penalties) {
  return (penalties || []).reduce((sum, row) => sum - (Number(row.credits) || 0), DEFAULT_CREDITS)
}

/** Penalties that have not been atoned for yet. */
export function openPenalties(penalties) {
  return (penalties || []).filter((row) => !row.atoned)
}

/** New projects are blocked while any penalty is open. */
export function isLocked(penalties) {
  return openPenalties(penalties).length > 0
}

export function isOverdue(project, ref = new Date()) {
  if (!project || project.status !== 'active') return false
  return String(project.due_date) < toISODate(ref)
}

export function dueMeta(project, ref = new Date()) {
  const time = project?.due_time ? ` · ${String(project.due_time).slice(0, 5)}` : ''
  return {
    label: `${formatDateShort(project?.due_date)}${time}`,
    overdue: isOverdue(project, ref),
  }
}

/** Active projects first (soonest deadline), then settled ones (most recent first). */
export function sortProjects(projects) {
  return [...(projects || [])].sort((a, b) => {
    const aActive = a.status === 'active' ? 0 : 1
    const bActive = b.status === 'active' ? 0 : 1
    if (aActive !== bActive) return aActive - bActive
    const order = String(a.due_date).localeCompare(String(b.due_date))
    return aActive === 0 ? order : -order
  })
}

export function statusLabel(status) {
  switch (status) {
    case 'passed':
      return 'Passed'
    case 'failed':
      return 'Failed'
    case 'missed':
      return 'Missed'
    default:
      return 'In progress'
  }
}

export function reasonLabel(reason) {
  return reason === 'missed' ? 'Deadline missed' : 'Assessment failed'
}
