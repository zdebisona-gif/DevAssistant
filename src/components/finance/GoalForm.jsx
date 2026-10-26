import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import Button from '../ui/Button.jsx'
import DateField from '../ui/DateField.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import { useData } from '../../data/store.jsx'
import { reportError } from '../../lib/alerts.js'
import { todayISO } from '../../lib/analytics.js'

const CADENCES = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
]

export default function GoalForm({ visible, record, onClose }) {
  const { c, fonts, text } = useTheme()
  const { createGoal, updateGoal } = useData()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [dueDate, setDueDate] = useState(todayISO())
  const [cadence, setCadence] = useState('monthly')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    setName(record?.name || '')
    setTarget(record?.target_amount != null ? String(record.target_amount) : '')
    setDueDate(record?.due_date || todayISO())
    setCadence(record?.target_cadence || 'monthly')
    setSaving(false)
  }, [record, visible])

  const valid = useMemo(() => {
    const t = Number(target)
    return Number.isFinite(t) && t > 0 && Boolean(dueDate)
  }, [target, dueDate])

  const save = useCallback(async () => {
    if (!valid || saving) return
    setSaving(true)
    Haptics.selectionAsync().catch(() => {})
    const payload = {
      name: name.trim(),
      target_amount: Number(target),
      due_date: dueDate,
      target_cadence: cadence,
    }
    try {
      if (record?.id) {
        await updateGoal(record.id, payload)
      } else {
        await createGoal(payload)
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      onClose?.()
    } catch (err) {
      reportError(err)
    } finally {
      setSaving(false)
    }
  }, [cadence, createGoal, dueDate, name, onClose, record?.id, saving, target, updateGoal, valid])

  return (
    <Sheet visible={visible} onClose={onClose} title={record?.id ? 'Edit financial goal' : 'New financial goal'}>
      <View style={{ gap: 16 }}>
        <Field label="Goal name (optional)" value={name} onChangeText={setName} placeholder="Emergency fund" />
        <Field
          label="Target amount"
          value={target}
          onChangeText={setTarget}
          placeholder="5000"
          keyboardType="decimal-pad"
        />
        <DateField label="Due date" value={dueDate} onChange={setDueDate} />
        <View style={{ gap: 8 }}>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
            Advice cadence
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CADENCES.map((item) => {
              const active = cadence === item.key
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  onPress={() => setCadence(item.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? c.accent : c.line,
                    backgroundColor: active ? c.accentSoft : 'transparent',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: fonts.sansMedium,
                      fontSize: text.micro,
                      color: active ? c.accentText : c.foreground,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button style={{ flex: 1 }} variant="ghost" onPress={onClose}>
            Cancel
          </Button>
          <Button style={{ flex: 1 }} variant="primary" onPress={save} disabled={!valid || saving} loading={saving}>
            Save
          </Button>
        </View>
      </View>
    </Sheet>
  )
}
