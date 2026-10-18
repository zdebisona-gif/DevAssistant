import { useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import TagPicker from '../ui/TagPicker.jsx'
import { NOTE_TAGS } from '../../data/constants.js'
import { useData } from '../../data/store.jsx'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function NoteForm({ visible, onClose, tag: initialTag = NOTE_TAGS[0] }) {
  const { c, fonts, text } = useTheme()
  const { createNote } = useData()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState(initialTag)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const close = () => {
    setTitle('')
    setBody('')
    setTag(initialTag)
    setError(null)
    onClose()
  }

  const submit = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      await createNote({ title: title.trim(), body: body.trim(), tag })
      close()
    } catch (cause) {
      setError(cause.message || 'Could not save the note.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={close} title="New note">
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="What's this about?" autoFocus />
      <Field label="Body" value={body} onChangeText={setBody} placeholder="Write it down…" multiline />
      <TagPicker label="Tag" options={NOTE_TAGS} value={tag} onChange={setTag} />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!title.trim()}>
        Save note
      </Button>
    </Sheet>
  )
}
