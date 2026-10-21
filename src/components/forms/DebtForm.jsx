import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import DateField from '../ui/DateField.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { DEBT_DIRECTION_LABELS, DEBT_DIRECTIONS } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { validateDebt } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const DIRECTION_OPTIONS = DEBT_DIRECTIONS.map((direction) => DEBT_DIRECTION_LABELS[direction])
const DIRECTION_BY_LABEL = Object.fromEntries(
  DEBT_DIRECTIONS.map((direction) => [DEBT_DIRECTION_LABELS[direction], direction]),
)

export default function DebtForm({ visible, onClose, record, defaultDirection }) {
  const { c, fonts, text } = useTheme()
  const { createDebt, updateDebt } = useData()
  const editing = Boolean(record)
  const [counterparty, setCounterparty] = useState('')
  const [direction, setDirection] = useState(DEBT_DIRECTION_LABELS.owed_to_me)
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCounterparty(record?.counterparty ?? '')
    setDirection(
      DEBT_DIRECTION_LABELS[record?.direction ?? defaultDirection] ?? DEBT_DIRECTION_LABELS.owed_to_me,
    )
    setAmount(record ? String(Number(record.amount) || '') : '')
    setDate(record?.due_date ?? '')
    setNote(record?.note ?? '')
    setError(null)
    setSaving(false)
  }, [visible, record, defaultDirection])

  const result = validateDebt({
    counterparty,
    direction: DIRECTION_BY_LABEL[direction],
    amount,
    due_date: date || null,
    note,
  })
  const valid = result.ok

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      if (editing) await updateDebt(record.id, result.payload)
      else await createDebt(result.payload)
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the debt.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit debt' : 'New debt'}
      subtitle={editing ? undefined : 'Track who owes whom, then settle in one tap'}
    >
      <TagPicker
        label="Direction"
        options={DIRECTION_OPTIONS}
        value={direction}
        onChange={setDirection}
      />
      <Field
        label={direction === DEBT_DIRECTION_LABELS.i_owe ? 'Owed to' : 'Who owes you'}
        value={counterparty}
        onChangeText={setCounterparty}
        placeholder="Name"
        autoFocus={!editing}
      />
      <Field
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <DateField label="Due date (optional)" value={date} onChange={setDate} />
      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="What for?" />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        {editing ? 'Save changes' : 'Add debt'}
      </Button>
    </Sheet>
  )
}
