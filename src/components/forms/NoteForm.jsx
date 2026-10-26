import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import SwitchRow from '../ui/SwitchRow.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { NOTE_TAGS } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { validateNote } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function NoteForm({ visible, onClose, record, defaults = null, notice = null, onSaved = null }) {
  const { c, fonts, text } = useTheme()
  const { createNote, updateNote } = useData()
  const editing = Boolean(record)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState(NOTE_TAGS[0])
  const [important, setImportant] = useState(false)
  const [link, setLink] = useState({ course_id: null, lesson_id: null })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(record?.title ?? defaults?.title ?? '')
    setBody(record?.body ?? defaults?.body ?? '')
    setTag(record?.tag ?? defaults?.tag ?? NOTE_TAGS[0])
    setImportant(Boolean(record?.important ?? defaults?.important))
    setLink({
      course_id: record?.course_id ?? defaults?.course_id ?? null,
      lesson_id: record?.lesson_id ?? defaults?.lesson_id ?? null,
    })
    setError(null)
    setSaving(false)
  }, [
    visible,
    record,
    defaults?.title,
    defaults?.body,
    defaults?.tag,
    defaults?.important,
    defaults?.course_id,
    defaults?.lesson_id,
  ])

  const result = validateNote({ title, body, tag, important, ...link })
  const valid = result.ok

  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      if (editing) await updateNote(record.id, result.payload)
      else await createNote(result.payload)
      onSaved?.(result.payload)
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the note.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit note' : 'New note'}>
      {notice ? (
        <View style={{ borderLeftWidth: 2, borderLeftColor: c.accent, paddingLeft: 10 }}>
          <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, lineHeight: 18, color: c.body }}>
            {notice}
          </Text>
        </View>
      ) : null}
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="What's this about?" autoFocus={!editing} />
      <Field label="Body" value={body} onChangeText={setBody} placeholder="Write it down…" multiline />
      <TagPicker label="Tag" options={NOTE_TAGS} value={tag} onChange={setTag} />
      <View style={{ marginHorizontal: -16 }}>
        <SwitchRow
          label="Important"
          description="Keep this note at the top of Notes."
          value={important}
          onValueChange={setImportant}
        />
      </View>
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!valid}>
        {editing ? 'Save changes' : 'Save note'}
      </Button>
    </Sheet>
  )
}
