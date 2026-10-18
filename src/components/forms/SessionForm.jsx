import { useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useData } from '../../data/store.jsx'
import { todayISO } from '../../lib/analytics.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function SessionForm({ visible, onClose }) {
  const { c, fonts, text } = useTheme()
  const { createSession } = useData()
  const [date, setDate] = useState(todayISO())
  const [hours, setHours] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const close = () => {
    setDate(todayISO())
    setHours('')
    setError(null)
    onClose()
  }

  const parsed = Number.parseFloat(hours)
  const valid = Number.isFinite(parsed) && parsed > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      await createSession({ studied_on: date, hours: parsed })
      close()
    } catch (cause) {
      setError(cause.message || 'Could not save the session.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={close} title="Log study session">
      <Field
        label="Hours"
        value={hours}
        onChangeText={setHours}
        placeholder="1.0"
        keyboardType="decimal-pad"
        autoFocus
      />
      <Field label="Date" value={date} onChangeText={setDate} hint="YYYY-MM-DD" />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        Save session
      </Button>
    </Sheet>
  )
}
