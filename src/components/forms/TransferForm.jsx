import { useEffect, useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import Button from '../ui/Button.jsx'
import Chip from '../ui/Chip.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useData } from '../../data/store.jsx'
import { accountRows } from '../../lib/accounts.js'
import { todayISO } from '../../lib/analytics.js'
import { money } from '../../lib/format.js'
import { parseNonNegative, parsePositive } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/*
 * Moves money between two saved accounts. The transfer itself is not a transaction,
 * so it never shows up as income or spending. An optional service fee is logged as
 * a real expense, because that money does leave the account.
 */

export default function TransferForm({ visible, onClose }) {
  const { c, fonts, text } = useTheme()
  const { data, transferBetweenAccounts } = useData()
  const accounts = useMemo(() => accountRows(data), [data])
  const [fromId, setFromId] = useState(null)
  const [toId, setToId] = useState(null)
  const [amount, setAmount] = useState('')
  const [fee, setFee] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFromId(accounts[0]?.id ?? null)
    setToId(accounts[1]?.id ?? null)
    setAmount('')
    setFee('')
    setError(null)
    setSaving(false)
    // Only reset when the sheet opens; account edits shouldn't clear what you typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const moved = parsePositive(amount)
  const charge = String(fee).trim() ? parseNonNegative(fee) : 0
  const sameAccount = Boolean(fromId && toId && fromId === toId)
  const valid = Boolean(moved && charge !== null && fromId && toId && !sameAccount)

  const from = accounts.find((account) => account.id === fromId) || null
  const to = accounts.find((account) => account.id === toId) || null
  const total = moved && charge !== null ? moved + charge : null

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      await transferBetweenAccounts({
        from_id: fromId,
        to_id: toId,
        amount: moved,
        fee: charge,
        occurred_on: todayISO(),
      })
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not move the money.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Transfer"
      subtitle="Move money between your accounts"
    >
      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
          From
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {accounts.map((account) => (
            <Chip key={account.id} active={fromId === account.id} onPress={() => setFromId(account.id)}>
              {account.name}
            </Chip>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
          To
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {accounts.map((account) => (
            <Chip key={account.id} active={toId === account.id} onPress={() => setToId(account.id)}>
              {account.name}
            </Chip>
          ))}
        </View>
      </View>

      {sameAccount ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.destructive }}>
          Choose two different accounts.
        </Text>
      ) : null}

      <Field
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
        autoFocus
      />
      <Field
        label="Service fee (optional)"
        value={fee}
        onChangeText={setFee}
        placeholder="0.00"
        keyboardType="decimal-pad"
        hint="Leave empty when the transfer is free. A fee is logged as spending."
      />

      {total !== null && from && to && !sameAccount ? (
        <Text
          style={{
            fontFamily: fonts.mono,
            fontSize: text.micro,
            lineHeight: 17,
            color: c.mutedForeground,
            fontVariant: ['tabular-nums'],
          }}
        >
          {from.name} −{money(total, 2)} · {to.name} +{money(moved, 2)}
          {charge ? ` · fee ${money(charge, 2)}` : ''}
        </Text>
      ) : null}

      {accounts.length < 2 ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
          Add at least two accounts in Settings to transfer between them.
        </Text>
      ) : (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, lineHeight: 17, color: c.mutedForeground }}>
          Both balances update right away. If you pick the wrong amount, fix it with Adjust balance on the account.
        </Text>
      )}

      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}

      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        Move money
      </Button>
    </Sheet>
  )
}
