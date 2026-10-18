import { useState } from 'react'
import { Text, View } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { MONEY_CATEGORIES } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { todayISO } from '../../lib/analytics.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

function currentPeriod() {
  return `${todayISO().slice(0, 7)}-01`
}

export default function BudgetForm({ visible, onClose }) {
  const { c, fonts, text } = useTheme()
  const { createBudget } = useData()
  const [category, setCategory] = useState(MONEY_CATEGORIES[0])
  const [limit, setLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const close = () => {
    setCategory(MONEY_CATEGORIES[0])
    setLimit('')
    setError(null)
    onClose()
  }

  const parsed = Number.parseFloat(limit)
  const valid = Number.isFinite(parsed) && parsed > 0

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      await createBudget({ category, limit_amount: parsed, period: currentPeriod() })
      close()
    } catch (cause) {
      setError(cause.message || 'Could not save the budget.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={close} title="New budget" subtitle="Applies to this month">
      <TagPicker label="Category" options={MONEY_CATEGORIES} value={category} onChange={setCategory} />
      <Field
        label="Monthly limit"
        value={limit}
        onChangeText={setLimit}
        placeholder="0.00"
        keyboardType="decimal-pad"
        autoFocus
      />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <View>
        <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
          Save budget
        </Button>
      </View>
    </Sheet>
  )
}
