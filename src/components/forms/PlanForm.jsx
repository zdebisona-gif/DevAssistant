import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import DateField from '../ui/DateField.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import TimeField from '../ui/TimeField.jsx'
import { PLAN_TAGS } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { todayISO } from '../../lib/analytics.js'
import { validatePlanEntry } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function PlanForm({ visible, onClose, date: initialDate, record, tag: initialTag }) {
  const { c, fonts, text } = useTheme()
  const { createPlanEntry, updatePlanEntry } = useData()
  const editing = Boolean(record)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(initialDate || todayISO())
  const [time, setTime] = useState('')
  const [tag, setTag] = useState(initialTag || PLAN_TAGS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(record?.title ?? '')
    setDate(record?.entry_date ?? initialDate ?? todayISO())
    setTime(record?.start_time ? String(record.start_time).slice(0, 5) : '')
    setTag(record?.tag ?? initialTag ?? PLAN_TAGS[0])
    setError(null)
    setSaving(false)
  }, [visible, record, initialDate, initialTag])

  const result = validatePlanEntry({ title, entry_date: date, time, tag })
  const valid = result.ok

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      if (editing) await updatePlanEntry(record.id, result.payload)
      else await createPlanEntry(result.payload)
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the entry.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit entry' : 'New plan entry'}>
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="What's the plan?" autoFocus={!editing} />
      <DateField label="Date" value={date} onChange={setDate} />
      <TimeField label="Start time" value={time} onChange={setTime} hint="Optional" />
      <TagPicker label="Tag" options={PLAN_TAGS} value={tag} onChange={setTag} />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        {editing ? 'Save changes' : 'Save entry'}
      </Button>
    </Sheet>
  )
}
