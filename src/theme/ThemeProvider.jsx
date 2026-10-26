import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SystemUI from 'expo-system-ui'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import { fonts, motion, palettes, radius, shadow, spacing, text } from './tokens.js'

const STORAGE_KEY = 'zeni.theme'
const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const system = useColorScheme()
  const [mode, setMode] = useState(system === 'dark' ? 'dark' : 'light')

  useEffect(() => {
    let active = true
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (active && (value === 'light' || value === 'dark')) setMode(value)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palettes[mode].background).catch(() => {})
  }, [mode])

  const toggle = useCallback(() => {
    const next = mode === 'light' ? 'dark' : 'light'
    setMode(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
  }, [mode])

  const value = useMemo(
    () => ({
      mode,
      c: palettes[mode],
      spacing,
      radius,
      text,
      motion,
      fonts,
      shadow: shadow(mode),
      toggle,
    }),
    [mode, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
