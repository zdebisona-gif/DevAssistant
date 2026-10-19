import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import DateField from '../ui/DateField.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TimeField from '../ui/TimeField.jsx'
import { useData } from '../../data/store.jsx'
import { todayISO } from '../../lib/analytics.js'
import { validateProject } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function ProjectForm({ visible, onClose, record }) {
  const { c, fonts, text } = useTheme()
  const { createProject, updateProject } = useData()
  const editing = Boolean(record)
  const [title, setTitle] = useState('')
  const [brief, setBrief] = useState('')
  const [criteria, setCriteria] = useState('')
  const [dueDate, setDueDate] = useState(todayISO())
  const [dueTime, setDueTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    setTitle(record?.title ?? '')
    setBrief(record?.brief ?? '')
    setCriteria(record?.criteria ?? '')
    setDueDate(record?.due_date ?? todayISO())
    setDueTime(record?.due_time ? String(record.due_time).slice(0, 5) : '')
    setError(null)
    setSaving(false)
  }, [visible, record])

  const result = validateProject({
    title,
    brief,
    criteria,
    due_date: dueDate,
    due_time: dueTime,
  })
  const valid = result.ok

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      if (editing) await updateProject(record.id, result.payload)
      else await createProject({ ...result.payload, status: 'active', position: 0 })
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the project.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit project' : 'New project'}>
      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="What are you shipping?"
        autoFocus={!editing}
      />
      <Field
        label="Brief"
        value={brief}
        onChangeText={setBrief}
        placeholder="What exactly will you deliver?"
        multiline
      />
      <Field
        label="Success criteria"
        value={criteria}
        onChangeText={setCriteria}
        placeholder="Optional · what counts as passed"
        hint="An assessor checks the submission against these"
        multiline
      />
      <DateField label="Deadline" value={dueDate} onChange={setDueDate} />
      <TimeField label="Time" value={dueTime} onChange={setDueTime} hint="Optional" />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        {editing ? 'Save changes' : 'Create project'}
      </Button>
    </Sheet>
  )
}
