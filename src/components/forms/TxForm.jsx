import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Button from '../ui/Button.jsx'
import Chip from '../ui/Chip.jsx'
import DateField from '../ui/DateField.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { MONEY_CATEGORIES } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { accountsFor } from '../../lib/accounts.js'
import { todayISO } from '../../lib/analytics.js'
import { validateTransaction } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const KINDS = ['Expense', 'Income']
const NONE = 'None'

export default function TxForm({ visible, onClose, record }) {
  const { c, fonts, text } = useTheme()
  const { data, createTransaction, updateTransaction } = useData()
  const editing = Boolean(record)
  const accounts = accountsFor(data)
  const [kind, setKind] = useState('Expense')
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(MONEY_CATEGORIES[0])
  const [accountId, setAccountId] = useState(null)
  const [legacyAccount, setLegacyAccount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    const signed = Number(record?.amount ?? 0)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKind(signed > 0 ? 'Income' : 'Expense')
    setMerchant(record?.merchant ?? '')
    setAmount(record ? String(Math.abs(signed)) : '')
    setCategory(record?.category ?? MONEY_CATEGORIES[0])
    setAccountId(record?.account_id ?? null)
    setLegacyAccount(record?.account ?? '')
    setDate(record?.occurred_on ?? todayISO())
    setError(null)
    setSaving(false)
  }, [visible, record])

  /* A row tagged before accounts existed keeps its free-text label until it is re-picked. */
  const legacyOption =
    legacyAccount && !accounts.some((account) => account.id === accountId) ? legacyAccount : null
  const options = [NONE, ...accounts.map((account) => account.name), ...(legacyOption ? [legacyOption] : [])]
  const selected = accountId
    ? accounts.find((account) => account.id === accountId)?.name ?? legacyOption ?? NONE
    : legacyOption ?? NONE

  const pickAccount = (option) => {
    if (option === NONE) {
      setAccountId(null)
      setLegacyAccount('')
      return
    }
    const found = accounts.find((account) => account.name === option)
    setAccountId(found?.id ?? null)
    setLegacyAccount(found ? '' : option)
  }

  const result = validateTransaction({
    type: kind === 'Income' ? 'income' : 'expense',
    merchant,
    amount,
    category,
    account: selected === NONE ? null : selected,
    account_id: accountId,
    occurred_on: date,
  })
  const valid = result.ok

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      if (editing) await updateTransaction(record.id, result.payload)
      else await createTransaction(result.payload)
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
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
          Account
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {options.map((option) => (
            <Chip key={option} active={selected === option} onPress={() => pickAccount(option)}>
              {option}
            </Chip>
          ))}
        </View>
        {!accounts.length ? (
          <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
            Add an account in Money to tag spending to it.
          </Text>
        ) : null}
      </View>
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
