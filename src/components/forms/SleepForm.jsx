import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Plus, Trash } from '../../icons.js'
import Button from '../ui/Button.jsx'
import DateField from '../ui/DateField.jsx'
import Sheet from '../ui/Sheet.jsx'
import TimeField from '../ui/TimeField.jsx'
import { useData } from '../../data/store.jsx'
import { todayISO } from '../../lib/analytics.js'
import { sleepWindowLabel } from '../../lib/sleep.js'
import { validateSleepLog } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const EMPTY_SESSION = { from: '', to: '' }

function shortTime(value) {
  return value ? String(value).slice(0, 5) : ''
}

function formSessions(record) {
  const sessions = Array.isArray(record?.sessions) ? record.sessions : []
  if (!sessions.length) return [{ ...EMPTY_SESSION }]
  return sessions.map((session) => ({
    from: shortTime(session?.from),
    to: shortTime(session?.to),
  }))
}

function storedSessions(record) {
  return (Array.isArray(record?.sessions) ? record.sessions : []).map((session) => ({
    from: shortTime(session?.from),
    to: shortTime(session?.to),
  }))
}

export default function SleepForm({ visible, onClose, record, defaultDate, existingDates = [] }) {
  const { c, fonts, radius, text } = useTheme()
  const { createSleepLog, updateSleepLog } = useData()
  const editing = Boolean(record)
  const [date, setDate] = useState(record?.log_date ?? defaultDate ?? todayISO())
  const [sessions, setSessions] = useState(formSessions(record))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const result = validateSleepLog({ log_date: date, sessions })
  const dayTaken = existingDates.includes(date) && record?.log_date !== date
  const valid = result.ok && !dayTaken

  const updateSession = (index, key, value) => {
    setSessions((prev) =>
      prev.map((session, position) =>
        position === index ? { ...session, [key]: value } : session,
      ),
    )
  }

  const addSession = () => {
    setSessions((prev) => (prev.length >= 6 ? prev : [...prev, { ...EMPTY_SESSION }]))
  }

  const removeSession = (index) => {
    setSessions((prev) => (prev.length <= 1 ? prev : prev.filter((_, position) => position !== index)))
  }

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      const changed =
        editing && result.ok
          ? JSON.stringify(result.payload.sessions.map((s) => ({
              from: shortTime(s.from),
              to: shortTime(s.to),
            }))) !== JSON.stringify(storedSessions(record)) ||
            result.payload.log_date !== record?.log_date
          : false
      const payload = {
        ...result.payload,
        ...(changed && record?.rating ? { assessment_stale: true } : {}),
      }
      if (editing) await updateSleepLog(record.id, payload)
      else await createSleepLog(payload)
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the sleep log.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit sleep' : 'Log sleep'}
      subtitle="Sessions for one wake date"
    >
      <DateField
        label="Wake date"
        value={date}
        onChange={setDate}
        hint="The morning you woke up. A bedtime later than wake time counts as the night before."
      />

      <View style={{ gap: 10 }}>
        {sessions.map((session, index) => (
          <View
            key={index}
            style={{
              gap: 10,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.background,
              padding: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
                Sleep {index + 1}
              </Text>
              {sessions.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove sleep ${index + 1}`}
                  onPress={() => removeSession(index)}
                  hitSlop={2}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: -12,
                    marginRight: -8,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Trash size={16} weight="bold" color={c.destructiveText} />
                </Pressable>
              ) : null}
            </View>
            <TimeField
              label="Bedtime"
              value={session.from}
              onChange={(value) => updateSession(index, 'from', value)}
            />
            <TimeField
              label="Wake time"
              value={session.to}
              onChange={(value) => updateSession(index, 'to', value)}
            />
            {session.from && session.to ? (
              <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}>
                {sleepWindowLabel({ from: session.from, to: session.to }, date)}
              </Text>
            ) : null}
          </View>
        ))}
        {sessions.length < 6 ? (
          <Button variant="secondary" icon={Plus} onPress={addSession}>
            Add another sleep
          </Button>
        ) : null}
      </View>

      {dayTaken ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>
          You already have a sleep log for this day. Open it to add another session.
        </Text>
      ) : null}
      {!valid && !dayTaken ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
          {result.error}
        </Text>
      ) : null}
      {editing && record?.rating ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}>
          Changing the day or sessions keeps the current score, but marks the assessment outdated.
        </Text>
      ) : null}
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        {editing ? 'Save changes' : 'Save sleep'}
      </Button>
    </Sheet>
  )
}
