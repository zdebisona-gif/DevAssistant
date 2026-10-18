import { useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useData } from '../../data/store.jsx'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function CourseForm({ visible, onClose }) {
  const { c, fonts, text } = useTheme()
  const { createCourse } = useData()
  const [name, setName] = useState('')
  const [total, setTotal] = useState('')
  const [completed, setCompleted] = useState('')
  const [next, setNext] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const close = () => {
    setName('')
    setTotal('')
    setCompleted('')
    setNext('')
    setError(null)
    onClose()
  }

  const totalUnits = Number.parseInt(total, 10)
  const completedUnits = completed ? Number.parseInt(completed, 10) : 0
  const valid =
    name.trim() &&
    Number.isFinite(totalUnits) &&
    totalUnits > 0 &&
    Number.isFinite(completedUnits) &&
    completedUnits >= 0 &&
    completedUnits <= totalUnits

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      await createCourse({
        name: name.trim(),
        total_units: totalUnits,
        completed_units: completedUnits,
        next_label: next.trim() || null,
      })
      close()
    } catch (cause) {
      setError(cause.message || 'Could not save the course.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={close} title="New course">
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Spanish — A2" autoFocus />
      <Field label="Total units" value={total} onChangeText={setTotal} placeholder="50" keyboardType="number-pad" />
      <Field
        label="Completed units"
        value={completed}
        onChangeText={setCompleted}
        placeholder="0"
        keyboardType="number-pad"
      />
      <Field label="Next up" value={next} onChangeText={setNext} placeholder="Optional · Lesson 35" />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        Save course
      </Button>
    </Sheet>
  )
}
