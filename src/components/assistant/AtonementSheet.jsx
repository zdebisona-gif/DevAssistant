import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { WarningCircle } from '../../icons.js'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useData } from '../../data/store.jsx'
import { reasonLabel } from '../../lib/projects.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/* A failed or missed project stays open until a written atonement clears it. */
export default function AtonementSheet({ visible, penalty, onClose }) {
  const { c, fonts, radius, text } = useTheme()
  const { atonePenalty } = useData()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    setNote('')
    setSaving(false)
    setError(null)
  }, [visible, penalty?.id])

  const valid = note.trim().length > 0

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      await atonePenalty({
        id: penalty.id,
        project_title: penalty.project_title,
        atonement: note.trim(),
      })
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not record the atonement.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Write an atonement" subtitle={penalty?.project_title}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 8,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: c.destructive,
          padding: 12,
        }}
      >
        <WarningCircle size={16} weight="bold" color={c.destructive} />
        <Text style={{ flex: 1, fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.body }}>
          {reasonLabel(penalty?.reason)} — {Number(penalty?.credits) || 0} credits forfeited. New projects stay
          locked until you write this through.
        </Text>
      </View>

      <Field
        label="What happened, and what changes next time?"
        value={note}
        onChangeText={setNote}
        placeholder="Be honest — this is saved as a note"
        multiline
        autoFocus
      />

      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}

      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        Atone and unlock
      </Button>
    </Sheet>
  )
}
