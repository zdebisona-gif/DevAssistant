import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useData } from '../../data/store.jsx'
import { validateLesson } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function LessonForm({ visible, onClose, moduleId, record, position = 0 }) {
  const { c, fonts, text } = useTheme()
  const { createLesson, updateLesson } = useData()
  const editing = Boolean(record)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    setTitle(record?.title ?? '')
    setContent(record?.content ?? '')
    setError(null)
    setSaving(false)
  }, [visible, record])

  const result = validateLesson({ title, content })

  const submit = async () => {
    if (!result.ok || saving) return
    setSaving(true)
    setError(null)
    try {
      if (editing) await updateLesson(record.id, result.payload)
      else await createLesson({ ...result.payload, module_id: moduleId, position })
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the lesson.')
      setSaving(false)
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? 'Edit lesson' : 'New lesson'}
      subtitle="Title and the notes you want to study from"
    >
      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. For loops"
        autoFocus={!editing}
      />
      <Field
        label="Content"
        value={content}
        onChangeText={setContent}
        placeholder="Write the lesson, paste notes, or generate it with AI later"
        multiline
      />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!result.ok}>
        {editing ? 'Save changes' : 'Save lesson'}
      </Button>
    </Sheet>
  )
}
