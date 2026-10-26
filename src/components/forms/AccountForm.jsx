import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import {
  ACCOUNT_COLOR_LABELS,
  ACCOUNT_COLORS,
  ACCOUNT_KIND_LABELS,
  ACCOUNT_KINDS,
} from '../../data/constants.js'
import { usePrivacy } from '../../data/privacy.jsx'
import { useData } from '../../data/store.jsx'
import { accountBalance } from '../../lib/accounts.js'
import { moneyOr } from '../../lib/format.js'
import { validateAccount } from '../../lib/validation.js'
import { accountColorGradients, accountGradients } from '../../theme/tokens.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const KIND_OPTIONS = ACCOUNT_KINDS.map((kind) => ACCOUNT_KIND_LABELS[kind])
const KIND_BY_LABEL = Object.fromEntries(ACCOUNT_KINDS.map((kind) => [ACCOUNT_KIND_LABELS[kind], kind]))
const COLOR_BY_LABEL = Object.fromEntries(
  ACCOUNT_COLORS.map((color) => [ACCOUNT_COLOR_LABELS[color], color]),
)

export default function AccountForm({ visible, onClose, record }) {
  const { c, fonts, text } = useTheme()
  const { data, createAccount, updateAccount } = useData()
  const { hidden, accountsHidden } = usePrivacy()
  const accountHidden = hidden || accountsHidden
  const editing = Boolean(record)
  const [name, setName] = useState('')
  const [kind, setKind] = useState(ACCOUNT_KIND_LABELS.other)
  const [color, setColor] = useState(ACCOUNT_COLOR_LABELS.default)
  const [opening, setOpening] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(record?.name ?? '')
    setKind(ACCOUNT_KIND_LABELS[record?.kind] ?? ACCOUNT_KIND_LABELS.other)
    setColor(ACCOUNT_COLOR_LABELS[record?.color] ?? ACCOUNT_COLOR_LABELS.default)
    setOpening(record ? String(Number(record.opening_balance) || 0) : '')
    setError(null)
    setSaving(false)
  }, [visible, record])

  const colorKey = COLOR_BY_LABEL[color] ?? 'default'
  const kindKey = KIND_BY_LABEL[kind] ?? 'other'
  const result = validateAccount({
    name,
    kind: kindKey,
    opening_balance: opening.trim() === '' ? 0 : opening,
    color: colorKey,
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
      subtitle={editing ? `Now ${moneyOr(live, accountHidden, 2)} with tagged spending` : 'Balances are tracked by hand'}
    >
      <Field
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="GCash, BDO, Cash…"
        autoFocus={!editing}
      />
      <TagPicker label="Kind" options={KIND_OPTIONS} value={kind} onChange={setKind} />
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.mutedForeground }}>
            Card color
          </Text>
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primaryFg }}>
            {ACCOUNT_COLOR_LABELS[colorKey]}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ACCOUNT_COLORS.map((key) => {
            const tones =
              key === 'default'
                ? accountGradients[kindKey] || accountGradients.other
                : accountColorGradients[key] || accountGradients.other
            const active = colorKey === key
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${ACCOUNT_COLOR_LABELS[key]} card color`}
                accessibilityState={{ selected: active }}
                onPress={() => setColor(ACCOUNT_COLOR_LABELS[key])}
                hitSlop={3}
                style={({ pressed }) => ({
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  padding: 3,
                  borderWidth: 2,
                  borderColor: active ? c.primaryFg : 'transparent',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{ flex: 1, borderRadius: 15, overflow: 'hidden' }}>
                  <Svg width="100%" height="100%">
                    <Defs>
                      <LinearGradient id={`account-color-${key}`} x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={tones[0]} />
                        <Stop offset="1" stopColor={tones[1]} />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill={`url(#account-color-${key})`} />
                  </Svg>
                </View>
              </Pressable>
            )
          })}
        </View>
        <Text style={{ fontFamily: fonts.sans, fontSize: text.micro, color: c.mutedForeground }}>
          {colorKey === 'default'
            ? 'Follows the account kind.'
            : 'Only changes how the card looks.'}
        </Text>
      </View>
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
