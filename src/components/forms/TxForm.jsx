import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import DateField from '../ui/DateField.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { MONEY_CATEGORIES } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { todayISO } from '../../lib/analytics.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const KINDS = ['Expense', 'Income']

export default function TxForm({ visible, onClose, record }) {
  const { c, fonts, text } = useTheme()
  const { createTransaction, updateTransaction } = useData()
  const editing = Boolean(record)
  const [kind, setKind] = useState('Expense')
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(MONEY_CATEGORIES[0])
  const [account, setAccount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    const signed = Number(record?.amount ?? 0)
    setKind(signed > 0 ? 'Income' : 'Expense')
    setMerchant(record?.merchant ?? '')
    setAmount(record ? String(Math.abs(signed)) : '')
    setCategory(record?.category ?? MONEY_CATEGORIES[0])
    setAccount(record?.account ?? '')
    setDate(record?.occurred_on ?? todayISO())
    setError(null)
    setSaving(false)
  }, [visible, record])

  const parsed = Number.parseFloat(amount)
  const valid = merchant.trim() && Number.isFinite(parsed) && parsed > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        merchant: merchant.trim(),
        amount: kind === 'Expense' ? -Math.abs(parsed) : Math.abs(parsed),
        category,
        account: account.trim() || null,
        occurred_on: date,
      }
      if (editing) await updateTransaction(record.id, payload)
      else await createTransaction(payload)
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the transaction.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit transaction' : 'New transaction'}>
      <TagPicker label="Type" options={KINDS} value={kind} onChange={setKind} />
      <Field
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <Field
        label="Merchant"
        value={merchant}
        onChangeText={setMerchant}
        placeholder="Where or who?"
        autoFocus={!editing}
      />
      <TagPicker label="Category" options={MONEY_CATEGORIES} value={category} onChange={setCategory} />
      <Field label="Account" value={account} onChangeText={setAccount} placeholder="Optional" />
      <DateField label="Date" value={date} onChange={setDate} />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        {editing ? 'Save changes' : 'Save transaction'}
      </Button>
    </Sheet>
  )
}
