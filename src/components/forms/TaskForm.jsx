import { useState } from 'react'
import { Pressable, Text } from 'react-native'
import Button from '../ui/Button.jsx'
import DateField from '../ui/DateField.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { PLAN_TAGS } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { validateTask } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function TaskForm({ visible, onClose, record }) {
  const { c, fonts, text } = useTheme()
  const { createTask, updateTask } = useData()
  const editing = Boolean(record)
  const [title, setTitle] = useState(record?.title ?? '')
  const [date, setDate] = useState(record?.due_date ?? '')
  const [tag, setTag] = useState(record?.tag ?? PLAN_TAGS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const result = validateTask({ title, due_date: date || null, tag })
  const valid = result.ok

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      if (editing) await updateTask(record.id, result.payload)
      else await createTask(result.payload)
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the task.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit task' : 'New task'}
      subtitle={editing ? undefined : 'A quick everyday item, separate from your calendar'}
    >
      <Field
        label="Task"
        value={title}
        onChangeText={setTitle}
        placeholder="What needs doing?"
        autoFocus={!editing}
      />
      <DateField label="Due date (optional)" value={date} onChange={setDate} />
      {date ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear due date"
          onPress={() => setDate('')}
          hitSlop={8}
          style={{ minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' }}
        >
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
            Clear due date
          </Text>
        </Pressable>
      ) : null}
      <TagPicker label="Tag" options={PLAN_TAGS} value={tag} onChange={setTag} />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>
          {error}
        </Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        {editing ? 'Save changes' : 'Add task'}
      </Button>
    </Sheet>
  )
}
