import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Button from '../ui/Button.jsx'
import Chip from '../ui/Chip.jsx'
import DateField from '../ui/DateField.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useData } from '../../data/store.jsx'
import { todayISO } from '../../lib/analytics.js'
import { validateSession } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function SessionForm({ visible, onClose, record, defaults }) {
  const { c, fonts, text } = useTheme()
  const { data, createSession, updateSession, createNote } = useData()
  const editing = Boolean(record)
  const [date, setDate] = useState(todayISO())
  const [hours, setHours] = useState('')
  const [courseId, setCourseId] = useState(null)
  const [takeaway, setTakeaway] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(record?.studied_on ?? todayISO())
    setHours(record ? String(Number(record.hours) || '') : defaults?.hours != null ? String(defaults.hours) : '')
    setCourseId(record?.course_id ?? defaults?.courseId ?? null)
    setTakeaway(record?.takeaway ?? '')
    setError(null)
    setSaving(false)
  }, [visible, record, defaults])

  const result = validateSession({ hours, studied_on: date, course_id: courseId, takeaway })
  const valid = result.ok
  const courseName = data.courses.find((course) => course.id === courseId)?.name

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await updateSession(record.id, result.payload)
      } else {
        await createSession(result.payload)
        if (takeaway.trim()) {
          await createNote({
            title: courseName ? `${courseName} — takeaway` : 'Study takeaway',
            body: takeaway.trim(),
            tag: 'Study',
          })
        }
      }
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the session.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit session' : 'Log study session'}>
      <Field
        label="Hours"
        value={hours}
        onChangeText={setHours}
        placeholder="1.0"
        keyboardType="decimal-pad"
        autoFocus={!editing}
      />
      <DateField label="Date" value={date} onChange={setDate} />
      {data.courses.length ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
            Course
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip active={!courseId} onPress={() => setCourseId(null)}>
              None
            </Chip>
            {data.courses.map((course) => (
              <Chip key={course.id} active={courseId === course.id} onPress={() => setCourseId(course.id)}>
                {course.name}
              </Chip>
            ))}
          </View>
        </View>
      ) : null}
      <Field
        label="Takeaway"
        value={takeaway}
        onChangeText={setTakeaway}
        placeholder="One line you want to remember"
        multiline
        hint={courseName ? `Saves a Study note titled "${courseName} — takeaway"` : 'Saves a Study note'}
      />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        {editing ? 'Save changes' : 'Save session'}
      </Button>
    </Sheet>
  )
}
