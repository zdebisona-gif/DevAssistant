import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Plus, Trash } from '../../icons.js'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import { useData } from '../../data/store.jsx'
import { confirmDelete } from '../../lib/alerts.js'
import { noteStamp, sleepNotes } from '../../lib/sleep.js'
import { validateSleepNote } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function SleepNotes({ log }) {
  const { c, fonts, radius, text } = useTheme()
  const { updateSleepLog } = useData()
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const notes = sleepNotes(log)

  const save = async (nextNotes) => {
    setSaving(true)
    setError(null)
    try {
      await updateSleepLog(log.id, {
        notes: nextNotes,
        note: '',
        ...(log.rating ? { assessment_stale: true } : {}),
      })
      return true
    } catch (cause) {
      setError(cause.message || 'Could not save the note.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const add = async () => {
    const result = validateSleepNote(draft)
    if (!result.ok) {
      setError(result.error)
      return
    }
    const saved = await save([...notes, { at: new Date().toISOString(), text: result.payload.text }])
    if (saved) setDraft('')
  }

  const remove = (index) => {
    confirmDelete('this sleep note', () => {
      save(notes.filter((_, position) => position !== index))
    })
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.heading, color: c.foreground }}>
          Notes
        </Text>
        <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
          {notes.length}
        </Text>
      </View>

      {notes.length ? (
        <View style={{ gap: 8 }}>
          {notes.map((note, index) => (
            <View
              key={`${note.at}-${index}`}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.background,
                padding: 10,
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                {note.at ? (
                  <Text style={{ fontFamily: fonts.mono, fontSize: text.micro, color: c.mutedForeground }}>
                    {noteStamp(note.at)}
                  </Text>
                ) : null}
                <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 19, color: c.body }}>
                  {note.text}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete note"
                onPress={() => remove(index)}
                disabled={saving}
                hitSlop={2}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -12,
                  marginRight: -6,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Trash size={15} weight="bold" color={c.mutedForeground} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 19, color: c.mutedForeground }}>
          Add how you felt during the day, your energy, focus, or how a nap affected you.
        </Text>
      )}

      <Field
        label="Add a note"
        value={draft}
        onChangeText={setDraft}
        placeholder="3:00 PM - focused and energetic"
        multiline
      />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button
        variant="secondary"
        size="sm"
        icon={Plus}
        onPress={add}
        loading={saving}
        disabled={!draft.trim()}
      >
        Add note
      </Button>
    </View>
  )
}
