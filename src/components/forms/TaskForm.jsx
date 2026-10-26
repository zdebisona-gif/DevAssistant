import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Button from '../ui/Button.jsx'
import DateField from '../ui/DateField.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import SwitchRow from '../ui/SwitchRow.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import TimeField from '../ui/TimeField.jsx'
import { PLAN_TAGS } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { todayISO } from '../../lib/analytics.js'
import { validateTask } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function TaskForm({ visible, onClose, record }) {
  const { c, fonts, text } = useTheme()
  const { createTask, updateTask } = useData()
  const editing = Boolean(record)
  const today = todayISO()
  const [title, setTitle] = useState(record?.title ?? '')
  const [date, setDate] = useState(record?.due_date ?? '')
  const [time, setTime] = useState(record?.due_time ? String(record.due_time).slice(0, 5) : '')
  const [tag, setTag] = useState(record?.tag ?? PLAN_TAGS[0])
  const [priority, setPriority] = useState(Boolean(record?.priority))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const keepingPastDate = editing && record?.due_date === date && date < today
  const result = validateTask(
    { title, due_date: date || null, due_time: time, tag, priority },
    { allowPast: keepingPastDate },
  )
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
      <DateField
        label="Due date (optional)"
        value={date}
        onChange={(next) => {
          setDate(next)
          if (!next) setTime('')
        }}
        minDate={today}
        hint={
          keepingPastDate
            ? 'Past due date kept. New dates must be today or later.'
            : 'Optional, today or later.'
        }
      />
      {date ? <TimeField label="Due time" value={time} onChange={setTime} hint="Optional" /> : null}
      {date ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear due date"
          onPress={() => {
            setDate('')
            setTime('')
          }}
          hitSlop={8}
          style={({ pressed }) => ({
            minHeight: 44,
            alignSelf: 'flex-start',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
            Clear due date
          </Text>
        </Pressable>
      ) : null}
      <TagPicker label="Tag" options={PLAN_TAGS} value={tag} onChange={setTag} />
      <View style={{ marginHorizontal: -16 }}>
        <SwitchRow
          label="Priority"
          description="Mark this task as something that needs attention."
          value={priority}
          onValueChange={setPriority}
        />
      </View>
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
