import { Alert } from 'react-native'

/** Confirmation step before a destructive delete. */
export function confirmDelete(title, onConfirm) {
  Alert.alert(`Delete ${title}?`, 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ])
}
