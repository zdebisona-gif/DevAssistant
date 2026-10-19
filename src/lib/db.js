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
  const [budgets, transactions, notes, courses, units, sessions, planner] = await Promise.all([
    selectAll('budgets', { column: 'category' }),
    selectAll('transactions', { column: 'occurred_on', ascending: false }),
    selectAll('notes', { column: 'updated_at', ascending: false }),
    selectAll('courses', { column: 'position' }),
    selectAll('course_units', { column: 'position' }),
    selectAll('study_sessions', { column: 'studied_on' }),
    selectAll('planner_entries', { column: 'entry_date' }),
  ])
  return { budgets, transactions, notes, courses, units, sessions, planner }
}

async function insert(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().single()
  if (error) throw error
  return data
}

async function update(table, id, patch) {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function remove(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

export const addNote = (row) => insert('notes', row)
export const updateNote = (id, patch) => update('notes', id, patch)
export const deleteNote = (id) => remove('notes', id)

export const addTransaction = (row) => insert('transactions', row)
export const updateTransaction = (id, patch) => update('transactions', id, patch)
export const deleteTransaction = (id) => remove('transactions', id)

export const addBudget = (row) => insert('budgets', row)
export const updateBudget = (id, patch) => update('budgets', id, patch)
export const deleteBudget = (id) => remove('budgets', id)

export const addCourse = (row) => insert('courses', row)
export const updateCourse = (id, patch) => update('courses', id, patch)
export const deleteCourse = (id) => remove('courses', id)

export const addCourseUnit = (row) => insert('course_units', row)
export const updateCourseUnit = (id, patch) => update('course_units', id, patch)
export const deleteCourseUnit = (id) => remove('course_units', id)

export const addSession = (row) => insert('study_sessions', row)
export const updateSession = (id, patch) => update('study_sessions', id, patch)
export const deleteSession = (id) => remove('study_sessions', id)

export const addPlanEntry = (row) => insert('planner_entries', row)
export const updatePlanEntry = (id, patch) => update('planner_entries', id, patch)
export const deletePlanEntry = (id) => remove('planner_entries', id)
