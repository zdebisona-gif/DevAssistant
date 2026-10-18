import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import DateField from '../ui/DateField.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useData } from '../../data/store.jsx'
import { todayISO } from '../../lib/analytics.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function SessionForm({ visible, onClose, record }) {
  const { c, fonts, text } = useTheme()
  const { createSession, updateSession } = useData()
  const editing = Boolean(record)
  const [date, setDate] = useState(todayISO())
  const [hours, setHours] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    setDate(record?.studied_on ?? todayISO())
    setHours(record ? String(Number(record.hours) || '') : '')
    setError(null)
    setSaving(false)
  }, [visible, record])

  const parsed = Number.parseFloat(hours)
  const valid = Number.isFinite(parsed) && parsed > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      const payload = { studied_on: date, hours: parsed }
      if (editing) await updateSession(record.id, payload)
      else await createSession(payload)
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
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        {editing ? 'Save changes' : 'Save session'}
      </Button>
    </Sheet>
  )
}
