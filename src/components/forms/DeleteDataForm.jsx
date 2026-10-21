import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { WarningCircle } from '../../icons.js'
import { useData } from '../../data/store.jsx'
import { useFocus } from '../../data/focus.jsx'
import { clearAskHistory } from '../../lib/askHistory.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/*
 * The one irreversible action in the app: wipe every record for the signed-in
 * account. Guarded by typing DELETE so it can never fire from a stray tap.
 */
export default function DeleteDataForm({ visible, onClose }) {
  const { c, fonts, radius, text } = useTheme()
  const { deleteAllData } = useData()
  const { active, cancel } = useFocus()
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfirm('')
    setError(null)
    setSaving(false)
  }, [visible])

  const ready = confirm.trim() === 'DELETE'

  const submit = async () => {
    if (!ready || saving) return
    setSaving(true)
    setError(null)
    try {
      await deleteAllData()
      await clearAskHistory()
      if (active) cancel()
      onClose(true)
    } catch {
      setError('Could not delete your data. Check your connection and try again.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Delete all data"
      subtitle="This cannot be undone"
    >
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          padding: 12,
          borderRadius: radius.md,
          backgroundColor: c.destructiveSoft,
        }}
      >
        <WarningCircle size={16} weight="bold" color={c.destructiveText} />
        <Text
          style={{ flex: 1, fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.destructiveText }}
        >
          Permanently removes every note, transaction, budget, account, debt, plan entry, task,
          sleep log, course, lesson, study session and project in this account. Your sign-in and
          app settings stay.
        </Text>
      </View>

      <Field
        label="Type DELETE to confirm"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="DELETE"
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
        editable={!saving}
      />

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.destructiveText }}
        >
          {error}
        </Text>
      ) : null}

      <Button variant="destructive" onPress={submit} loading={saving} disabled={!ready || saving}>
        Delete everything
      </Button>
    </Sheet>
  )
}
