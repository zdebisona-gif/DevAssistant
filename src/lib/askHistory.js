import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'zeni.ask.history'
const MAX = 6

export async function loadAskHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function pushAskHistory(question, current) {
  const value = String(question || '').trim()
  if (!value) return current
  const next = [value, ...current.filter((item) => item !== value)].slice(0, MAX)
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  return next
}

export async function clearAskHistory() {
  try {
    await AsyncStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
