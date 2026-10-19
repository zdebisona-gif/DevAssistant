import { Text, View } from 'react-native'
import { Trash } from '../../icons.js'
import Button from '../ui/Button.jsx'
import Sheet from '../ui/Sheet.jsx'
import { relativeTime } from '../../lib/analytics.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/* Read-only popup for a note, with Edit and Delete actions. */
export default function NoteView({ note, onClose, onEdit, onDelete }) {
  const { c, fonts, text } = useTheme()
  const stamp = note ? relativeTime(note.updated_at) : ''
  const subtitle = note?.tag ? `${note.tag} · ${stamp}` : stamp

  return (
    <Sheet visible={Boolean(note)} onClose={onClose} title={note?.title ?? ''} subtitle={subtitle}>
      {note?.body ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.body, lineHeight: 22, color: c.body }}>
          {note.body}
        </Text>
      ) : (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.body, color: c.mutedForeground }}>
          This note has no body yet.
        </Text>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="primary" onPress={onEdit} style={{ flex: 1 }}>
          Edit
        </Button>
        <Button variant="secondary" icon={Trash} onPress={onDelete}>
          Delete
        </Button>
      </View>
    </Sheet>
  )
}
