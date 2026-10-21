import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { usePrivacy } from '../../data/privacy.jsx'
import { useData } from '../../data/store.jsx'
import { moneyOr } from '../../lib/format.js'
import { parsePositive } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/*
 * Balance operations for one account. "Add" and "Take out" nudge the stored opening
 * balance; "Set balance" reconciles it so the derived figure matches what the user sees.
 * None of these create a transaction, so they never touch income or spend totals.
 */

const MODES = ['Add money', 'Take out', 'Set balance']
const MODE_KEY = { 'Add money': 'add', 'Take out': 'subtract', 'Set balance': 'set' }

export default function AdjustAccountSheet({ visible, account, mode = 'add', onClose }) {
  const { c, fonts, text } = useTheme()
  const { hidden, accountsHidden } = usePrivacy()
  const accountHidden = hidden || accountsHidden
  const { adjustOpeningBalance, reconcileAccount } = useData()
  const [choice, setChoice] = useState('Add money')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(MODES.find((label) => MODE_KEY[label] === mode) ?? 'Add money')
    setAmount('')
    setError(null)
    setSaving(false)
  }, [visible, mode])

  const value = parsePositive(amount)
  const valid = value !== null

  const submit = async () => {
    if (!valid || saving || !account) return
    setSaving(true)
    setError(null)
    try {
      const key = MODE_KEY[choice]
      if (key === 'set') await reconcileAccount(account.id, value)
      else await adjustOpeningBalance(account.id, key === 'add' ? value : -value)
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not update the balance.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={account?.name ?? 'Adjust balance'}
      subtitle={`Current balance ${moneyOr(account?.balance ?? 0, accountHidden, 2)}`}
    >
      <TagPicker label="Action" options={MODES} value={choice} onChange={setChoice} />
      <Field
        label={choice === 'Set balance' ? 'Balance it should be' : 'Amount'}
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
        autoFocus
        hint={
          choice === 'Set balance'
            ? 'The opening balance is adjusted so the account matches this figure.'
            : 'A manual adjustment — it is not logged as income or spending.'
        }
      />
      {accountHidden ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}>
          Balances are hidden on screen; this update still applies.
        </Text>
      ) : null}
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        {choice === 'Set balance' ? 'Set balance' : choice}
      </Button>
    </Sheet>
  )
}
