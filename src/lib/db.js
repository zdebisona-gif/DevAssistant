import { supabase } from './supabase.js'

async function selectAll(table, order) {
  let query = supabase.from(table).select('*')
  if (order) query = query.order(order.column, { ascending: order.ascending ?? true })
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/** Fetch every table the app reads. Rows are tiny, so one round-trip each is fine. */
export async function loadAll() {
  const [budgets, transactions, notes, courses, sessions, planner] = await Promise.all([
    selectAll('budgets', { column: 'category' }),
    selectAll('transactions', { column: 'occurred_on', ascending: false }),
    selectAll('notes', { column: 'updated_at', ascending: false }),
    selectAll('courses', { column: 'position' }),
    selectAll('study_sessions', { column: 'studied_on' }),
    selectAll('planner_entries', { column: 'entry_date' }),
  ])
  return { budgets, transactions, notes, courses, sessions, planner }
}

async function insert(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().single()
  if (error) throw error
  return data
}

export const addNote = (row) => insert('notes', row)
export const addTransaction = (row) => insert('transactions', row)
export const addBudget = (row) => insert('budgets', row)
export const addCourse = (row) => insert('courses', row)
export const addSession = (row) => insert('study_sessions', row)
export const addPlanEntry = (row) => insert('planner_entries', row)

export async function setPlanEntryDone(id, done) {
  const { error } = await supabase.from('planner_entries').update({ done }).eq('id', id)
  if (error) throw error
}

export async function removeNote(id) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}
