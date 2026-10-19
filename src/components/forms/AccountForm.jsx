import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { ACCOUNT_KIND_LABELS, ACCOUNT_KINDS } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { accountBalance } from '../../lib/accounts.js'
import { money } from '../../lib/format.js'
import { validateAccount } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const KIND_OPTIONS = ACCOUNT_KINDS.map((kind) => ACCOUNT_KIND_LABELS[kind])
const KIND_BY_LABEL = Object.fromEntries(ACCOUNT_KINDS.map((kind) => [ACCOUNT_KIND_LABELS[kind], kind]))

export default function AccountForm({ visible, onClose, record }) {
  const { c, fonts, text } = useTheme()
  const { data, createAccount, updateAccount } = useData()
  const editing = Boolean(record)
  const [name, setName] = useState('')
  const [kind, setKind] = useState(ACCOUNT_KIND_LABELS.other)
  const [opening, setOpening] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    setName(record?.name ?? '')
    setKind(ACCOUNT_KIND_LABELS[record?.kind] ?? ACCOUNT_KIND_LABELS.other)
    setOpening(record ? String(Number(record.opening_balance) || 0) : '')
    setError(null)
    setSaving(false)
  }, [visible, record])

  const result = validateAccount({
    name,
    kind: KIND_BY_LABEL[kind],
    opening_balance: opening.trim() === '' ? 0 : opening,
  })
  const valid = result.ok

  const live = editing ? accountBalance(record, data.transactions) : null

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      if (editing) await updateAccount(record.id, result.payload)
      else await createAccount({ ...result.payload, position: data.accounts.length })
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the account.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit account' : 'New account'}
      subtitle={editing ? `Now ${money(live, 2)} with tagged spending` : 'Balances are tracked by hand'}
    >
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="GCash, BDO, Cash…"
        autoFocus={!editing}
      />
      <TagPicker label="Kind" options={KIND_OPTIONS} value={kind} onChange={setKind} />
      <Field
        label="Opening balance"
        value={opening}
        onChangeText={setOpening}
        placeholder="0.00"
        keyboardType="decimal-pad"
        hint={
          editing
            ? 'Transactions tagged to this account are added on top of this figure.'
            : 'What is in the account today before any tagged transactions.'
        }
      />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        {editing ? 'Save changes' : 'Add account'}
      </Button>
    </Sheet>
  )
}
