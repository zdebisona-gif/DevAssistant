import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { NOTE_TAGS } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function NoteForm({ visible, onClose, record }) {
  const { c, fonts, text } = useTheme()
  const { createNote, updateNote } = useData()
  const editing = Boolean(record)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState(NOTE_TAGS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    setTitle(record?.title ?? '')
    setBody(record?.body ?? '')
    setTag(record?.tag ?? NOTE_TAGS[0])
    setError(null)
    setSaving(false)
  }, [visible, record])

  const submit = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const payload = { title: title.trim(), body: body.trim(), tag }
      if (editing) await updateNote(record.id, payload)
      else await createNote(payload)
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the note.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit note' : 'New note'}>
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="What's this about?" autoFocus={!editing} />
      <Field label="Body" value={body} onChangeText={setBody} placeholder="Write it down…" multiline />
      <TagPicker label="Tag" options={NOTE_TAGS} value={tag} onChange={setTag} />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!title.trim()}>
        {editing ? 'Save changes' : 'Save note'}
      </Button>
    </Sheet>
  )
}
