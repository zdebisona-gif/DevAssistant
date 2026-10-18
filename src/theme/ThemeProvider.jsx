import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
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
      toggle: () =>
        setMode((current) => {
          const next = current === 'light' ? 'dark' : 'light'
          AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
          return next
        }),
    }),
    [mode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
