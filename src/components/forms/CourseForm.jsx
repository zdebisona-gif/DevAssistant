import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useData } from '../../data/store.jsx'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function CourseForm({ visible, onClose, record }) {
  const { c, fonts, text } = useTheme()
  const { createCourse, updateCourse } = useData()
  const editing = Boolean(record)
  const [name, setName] = useState('')
  const [total, setTotal] = useState('')
  const [completed, setCompleted] = useState('')
  const [next, setNext] = useState('')
  const [weekly, setWeekly] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    setName(record?.name ?? '')
    setTotal(record ? String(record.total_units ?? '') : '')
    setCompleted(record ? String(record.completed_units ?? '') : '')
    setNext(record?.next_label ?? '')
    setWeekly(record && Number(record.weekly_target_hours) > 0 ? String(Number(record.weekly_target_hours)) : '')
    setError(null)
    setSaving(false)
  }, [visible, record])

  const totalUnits = Number.parseInt(total, 10)
  const completedUnits = completed ? Number.parseInt(completed, 10) : 0
  const weeklyHours = weekly ? Number.parseFloat(weekly) : 0
  const valid =
    name.trim() &&
    Number.isFinite(totalUnits) &&
    totalUnits > 0 &&
    Number.isFinite(completedUnits) &&
    completedUnits >= 0 &&
    completedUnits <= totalUnits &&
    Number.isFinite(weeklyHours) &&
    weeklyHours >= 0

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: name.trim(),
        total_units: totalUnits,
        completed_units: completedUnits,
        next_label: next.trim() || null,
        weekly_target_hours: weeklyHours || 0,
      }
      if (editing) await updateCourse(record.id, payload)
      else await createCourse(payload)
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the course.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit course' : 'New course'}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Spanish — A2" autoFocus={!editing} />
      <Field label="Total units" value={total} onChangeText={setTotal} placeholder="50" keyboardType="number-pad" />
      <Field
        label="Completed units"
        value={completed}
        onChangeText={setCompleted}
        placeholder="0"
        keyboardType="number-pad"
      />
      <Field label="Next up" value={next} onChangeText={setNext} placeholder="Optional · Lesson 35" />
      <Field
        label="Weekly target (hours)"
        value={weekly}
        onChangeText={setWeekly}
        placeholder="0"
        keyboardType="decimal-pad"
        hint="Optional · shows weekly progress in Learning"
      />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        {editing ? 'Save changes' : 'Save course'}
      </Button>
    </Sheet>
  )
}
