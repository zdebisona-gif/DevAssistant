import { Alert } from 'react-native'

/** Long-press menu for a record row: Edit, Delete or Cancel. */
export function recordActions({ title, onEdit, onDelete }) {
  Alert.alert(title, undefined, [
    { text: 'Edit', onPress: onEdit },
    { text: 'Delete', style: 'destructive', onPress: onDelete },
    { text: 'Cancel', style: 'cancel' },
  ])
}
