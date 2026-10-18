import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { PLAN_TAGS } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { todayISO } from '../../lib/analytics.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function PlanForm({ visible, onClose, date: initialDate }) {
  const { c, fonts, text } = useTheme()
  const { createPlanEntry } = useData()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(initialDate || todayISO())
  const [time, setTime] = useState('')
  const [tag, setTag] = useState(PLAN_TAGS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (visible) setDate(initialDate || todayISO())
  }, [visible, initialDate])

  const close = () => {
    setTitle('')
    setDate(todayISO())
    setTime('')
    setTag(PLAN_TAGS[0])
    setError(null)
    onClose()
  }

  const valid = title.trim() && /^\d{4}-\d{2}-\d{2}$/.test(date)
  const normalizedTime = /^\d{1,2}:\d{2}$/.test(time) ? `${time.padStart(5, '0')}:00` : null

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      await createPlanEntry({
        title: title.trim(),
        entry_date: date,
        start_time: normalizedTime,
        tag,
      })
      close()
    } catch (cause) {
      setError(cause.message || 'Could not save the entry.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={close} title="New plan entry">
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="What's the plan?" autoFocus />
      <Field label="Date" value={date} onChangeText={setDate} hint="YYYY-MM-DD" />
      <Field label="Start time" value={time} onChangeText={setTime} placeholder="09:00" hint="Optional · 24h HH:MM" />
      <TagPicker label="Tag" options={PLAN_TAGS} value={tag} onChange={setTag} />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        Save entry
      </Button>
    </Sheet>
  )
}
