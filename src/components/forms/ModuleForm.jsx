import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import Button from '../ui/Button.jsx'
import Field from '../ui/Field.jsx'
import Sheet from '../ui/Sheet.jsx'
import { useData } from '../../data/store.jsx'
import { validateModule } from '../../lib/validation.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function ModuleForm({ visible, onClose, courseId, record, position = 0 }) {
  const { c, fonts, text } = useTheme()
  const { createModule, updateModule } = useData()
  const editing = Boolean(record)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!visible) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(record?.title ?? '')
    setDescription(record?.description ?? '')
    setError(null)
    setSaving(false)
  }, [visible, record])

  const result = validateModule({ title, description })

  const submit = async () => {
    if (!result.ok || saving) return
    setSaving(true)
    setError(null)
    try {
      if (editing) await updateModule(record.id, result.payload)
      else await createModule({ ...result.payload, course_id: courseId, position })
      onClose()
    } catch (cause) {
      setError(cause.message || 'Could not save the module.')
      setSaving(false)
    }
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={editing ? 'Edit module' : 'New module'}>
      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Control flow"
        autoFocus={!editing}
      />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Optional"
        multiline
      />
      {error ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.destructive }}>{error}</Text>
      ) : null}
      <Button variant="primary" onPress={submit} loading={saving} disabled={!result.ok}>
        {editing ? 'Save changes' : 'Save module'}
      </Button>
    </Sheet>
  )
}
