import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useAuth } from '../../data/auth.jsx'
import { describeAuthError } from '../../lib/auth.js'
import { MIN_PASSWORD_LENGTH, validatePasswordChange } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function ChangePasswordForm({ visible, onClose }) {
  const { c, fonts, text } = useTheme()
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrent('')
    setNext('')
    setConfirm('')
    setError(null)
    setSaving(false)
  }, [visible])

  const result = validatePasswordChange({ current, next, confirm })
  const mismatch = confirm.length > 0 && next !== confirm
  const reused = next.length > 0 && next === current

  const submit = async () => {
    if (!result.ok || saving) return
    setSaving(true)
    setError(null)
    try {
      await changePassword(result.payload.current, result.payload.next)
      onClose(true)
    } catch (cause) {
      if (cause?.code === 'current_password') {
        setError('Current password is incorrect.')
      } else {
        setError(describeAuthError(cause, 'Could not change your password. Try again.'))
      }
      setSaving(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Change password"
      subtitle="Confirm your current password first"
    >
      <Field
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        placeholder="Your current password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="next"
        autoFocus
        editable={!saving}
      />
      <Field
        label="New password"
        value={next}
        onChangeText={setNext}
        placeholder="Your new password"
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        editable={!saving}
      />
      <Field
        label="Confirm new password"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Repeat the new password"
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={submit}
        editable={!saving}
      />
      {mismatch ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>
          The new passwords do not match.
        </Text>
      ) : null}
      {reused ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>
          Choose a password different from your current one.
        </Text>
      ) : null}
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.destructive }}
        >
          {error}
        </Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!result.ok || saving}>
        Update password
      </Button>
    </Sheet>
  )
}
