import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { MONEY_CATEGORIES } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { todayISO } from '../../lib/analytics.js'
import { validateBudget } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

function currentPeriod() {
  return `${todayISO().slice(0, 7)}-01`
}

export default function BudgetForm({ visible, onClose, record }) {
  const { c, fonts, text } = useTheme()
  const { createBudget, updateBudget } = useData()
  const editing = Boolean(record)
  const [category, setCategory] = useState(MONEY_CATEGORIES[0])
  const [limit, setLimit] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategory(record?.category ?? MONEY_CATEGORIES[0])
    setLimit(record ? String(Number(record.limit_amount) || '') : '')
    setError(null)
    setSaving(false)
  }, [visible, record])

  const result = validateBudget({ category, limit, period: editing ? undefined : currentPeriod() })
  const valid = result.ok

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      if (editing) await updateBudget(record.id, result.payload)
      else await createBudget(result.payload)
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the budget.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit budget' : 'New budget'}
      subtitle="Applies to this month"
    >
      <TagPicker label="Category" options={MONEY_CATEGORIES} value={category} onChange={setCategory} />
      <Field
        label="Monthly limit"
        value={limit}
        onChangeText={setLimit}
        placeholder="0.00"
        keyboardType="decimal-pad"
        autoFocus={!editing}
      />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <View>
        <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
          {editing ? 'Save changes' : 'Save budget'}
        </Button>
      </View>
    </Sheet>
  )
}
