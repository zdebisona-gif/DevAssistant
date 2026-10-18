import AsyncStorage from '@react-native-async-storage/async-storage'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const KEY = 'zeni.onboarded'

export async function isOnboarded() {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1'
  } catch {
    return false
  }
}

export async function setOnboarded() {
  try {
    await AsyncStorage.setItem(KEY, '1')
  } catch {
    /* ignore */
  }
}

export async function resetOnboarding() {
  try {
    await AsyncStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

const OnboardingContext = createContext(null)

export function OnboardingProvider({ children }) {
  const [ready, setReady] = useState(false)
  const [onboarded, setOnboardedState] = useState(false)

  useEffect(() => {
    let active = true
    isOnboarded().then((value) => {
      if (!active) return
      setOnboardedState(value)
      setReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(
    () => ({
      ready,
      onboarded,
      complete: async () => {
        await setOnboarded()
        setOnboardedState(true)
      },
      reset: async () => {
        await resetOnboarding()
        setOnboardedState(false)
      },
    }),
    [ready, onboarded],
  )

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}
