import { FiraCode_400Regular } from '@expo-google-fonts/fira-code/400Regular'
import { FiraCode_500Medium } from '@expo-google-fonts/fira-code/500Medium'
import { FiraCode_600SemiBold } from '@expo-google-fonts/fira-code/600SemiBold'
import { FiraSans_400Regular } from '@expo-google-fonts/fira-sans/400Regular'
import { FiraSans_500Medium } from '@expo-google-fonts/fira-sans/500Medium'
import { FiraSans_600SemiBold } from '@expo-google-fonts/fira-sans/600SemiBold'
import { useFonts } from 'expo-font'
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  Stack,
  useRouter,
  useSegments,
} from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../src/data/auth.jsx'
import { DataProvider } from '../src/data/store.jsx'
import { FocusProvider } from '../src/data/focus.jsx'
import { AiPrefsProvider } from '../src/data/aiPrefs.jsx'
import { PrivacyProvider } from '../src/data/privacy.jsx'
import { RemindersProvider } from '../src/data/reminders.jsx'
import { subscribeToNotificationTaps } from '../src/lib/notifications.js'
import { OnboardingProvider, useOnboarding } from '../src/lib/onboarding.js'
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider.jsx'

SplashScreen.preventAutoHideAsync().catch(() => {})

function useNotificationObserver(enabled) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled) return
    let active = true
    let unsubscribe

    subscribeToNotificationTaps((url) => {
      if (active) router.push(url)
    })
      .then((cleanup) => {
        if (active) unsubscribe = cleanup
        else cleanup()
      })
      .catch(() => {})

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [enabled, router])
}

function RootStack() {
  const { c, mode } = useTheme()
  const { session, loading: authLoading } = useAuth()
  const { ready, onboarded } = useOnboarding()
  const segments = useSegments()
  const router = useRouter()
  const signedIn = !!session

  const navigationTheme = useMemo(() => {
    const base = mode === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme
    return {
      ...base,
      dark: mode === 'dark',
      colors: {
        ...base.colors,
        background: c.background,
        card: c.background,
        text: c.foreground,
        border: c.border,
        primary: c.primary,
        notification: c.accent,
      },
    }
  }, [c, mode])

  useNotificationObserver(signedIn && onboarded)

  useEffect(() => {
    if (authLoading || !ready) return
    SplashScreen.hideAsync().catch(() => {})
    const inSignIn = segments[0] === 'sign-in'
    const inWelcome = segments[0] === 'welcome'

    if (!signedIn) {
      if (!inSignIn) router.replace('/sign-in')
    } else if (!onboarded) {
      if (!inWelcome) router.replace('/welcome')
    } else if (inSignIn || inWelcome) {
      router.replace('/')
    }
  }, [authLoading, ready, signedIn, onboarded, segments, router])

  if (authLoading || !ready) return null

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="ask" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="learning" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="course/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="lesson/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="projects" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="sleep" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="reminders" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
      </Stack>
    </NavigationThemeProvider>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    FiraSans_400Regular,
    FiraSans_500Medium,
    FiraSans_600SemiBold,
    FiraCode_400Regular,
    FiraCode_500Medium,
    FiraCode_600SemiBold,
  })

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <DataProvider>
            <FocusProvider>
              <AiPrefsProvider>
                <PrivacyProvider>
                  <RemindersProvider>
                    <OnboardingProvider>
                      {fontsLoaded ? <RootStack /> : null}
                    </OnboardingProvider>
                  </RemindersProvider>
                </PrivacyProvider>
              </AiPrefsProvider>
            </FocusProvider>
          </DataProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
