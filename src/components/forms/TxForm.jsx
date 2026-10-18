import { useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { MONEY_CATEGORIES } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { todayISO } from '../../lib/analytics.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const KINDS = ['Expense', 'Income']

export default function TxForm({ visible, onClose }) {
  const { c, fonts, text } = useTheme()
  const { createTransaction } = useData()
  const [kind, setKind] = useState('Expense')
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(MONEY_CATEGORIES[0])
  const [account, setAccount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const close = () => {
    setKind('Expense')
    setMerchant('')
    setAmount('')
    setCategory(MONEY_CATEGORIES[0])
    setAccount('')
    setDate(todayISO())
    setError(null)
    onClose()
  }

  const parsed = Number.parseFloat(amount)
  const valid = merchant.trim() && Number.isFinite(parsed) && parsed > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      await createTransaction({
        merchant: merchant.trim(),
        amount: kind === 'Expense' ? -Math.abs(parsed) : Math.abs(parsed),
        category,
        account: account.trim() || null,
        occurred_on: date,
      })
      close()
    } catch (cause) {
      setError(cause.message || 'Could not save the transaction.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={close} title="New transaction">
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
        autoFocus
      />
      <TagPicker label="Category" options={MONEY_CATEGORIES} value={category} onChange={setCategory} />
      <Field label="Account" value={account} onChangeText={setAccount} placeholder="Optional" />
      <Field label="Date" value={date} onChangeText={setDate} hint="YYYY-MM-DD" />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        Save transaction
      </Button>
    </Sheet>
  )
}
