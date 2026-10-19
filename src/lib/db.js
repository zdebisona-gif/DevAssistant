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
  const [
    budgets,
    transactions,
    notes,
    courses,
    modules,
    lessons,
    sessions,
    planner,
    projects,
    penalties,
    accounts,
    debts,
  ] = await Promise.all([
    selectAll('budgets', { column: 'category' }),
    selectAll('transactions', { column: 'occurred_on', ascending: false }),
    selectAll('notes', { column: 'updated_at', ascending: false }),
    selectAll('courses', { column: 'position' }),
    selectAll('course_modules', { column: 'position' }),
    selectAll('lessons', { column: 'position' }),
    selectAll('study_sessions', { column: 'studied_on' }),
    selectAll('planner_entries', { column: 'entry_date' }),
    selectAll('projects', { column: 'due_date' }),
    selectAll('project_penalties', { column: 'created_at', ascending: false }),
    selectAll('accounts', { column: 'position' }),
    selectAll('debts', { column: 'created_at', ascending: false }),
  ])
  return {
    budgets,
    transactions,
    notes,
    courses,
    modules,
    lessons,
    sessions,
    planner,
    projects,
    penalties,
    accounts,
    debts,
  }
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

export const addModule = (row) => insert('course_modules', row)
export const updateModule = (id, patch) => update('course_modules', id, patch)
export const deleteModule = (id) => remove('course_modules', id)

export const addLesson = (row) => insert('lessons', row)
export const updateLesson = (id, patch) => update('lessons', id, patch)
export const deleteLesson = (id) => remove('lessons', id)

export const addSession = (row) => insert('study_sessions', row)
export const updateSession = (id, patch) => update('study_sessions', id, patch)
export const deleteSession = (id) => remove('study_sessions', id)

export const addPlanEntry = (row) => insert('planner_entries', row)
export const updatePlanEntry = (id, patch) => update('planner_entries', id, patch)
export const deletePlanEntry = (id) => remove('planner_entries', id)

export const addProject = (row) => insert('projects', row)
export const updateProject = (id, patch) => update('projects', id, patch)
export const deleteProject = (id) => remove('projects', id)

export const addPenalty = (row) => insert('project_penalties', row)
export const updatePenalty = (id, patch) => update('project_penalties', id, patch)
export const deletePenalty = (id) => remove('project_penalties', id)

export const addAccount = (row) => insert('accounts', row)
export const updateAccount = (id, patch) => update('accounts', id, patch)
export const deleteAccount = (id) => remove('accounts', id)

export const addDebt = (row) => insert('debts', row)
export const updateDebt = (id, patch) => update('debts', id, patch)
export const deleteDebt = (id) => remove('debts', id)

/** Wipe every record the signed-in account owns. Scoped server-side by auth.uid(). */
export async function deleteAllData() {
  const { error } = await supabase.rpc('delete_all_data')
  if (error) throw error
}
