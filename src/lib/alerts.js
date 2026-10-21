import { Alert } from 'react-native'

/** Confirmation step before a destructive delete. */
export function confirmDelete(title, onConfirm) {
  Alert.alert(`Delete ${title}?`, 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ])
}

/** Surface a failed write instead of letting it pass silently. */
export function reportError(error, title = "Couldn't save that") {
  const detail = error?.message
    ? String(error.message)
    : 'Please check your connection and try again.'
  Alert.alert(title, detail)
}
