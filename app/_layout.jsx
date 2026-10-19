import { FiraCode_400Regular } from '@expo-google-fonts/fira-code/400Regular'
import { FiraCode_500Medium } from '@expo-google-fonts/fira-code/500Medium'
import { FiraCode_600SemiBold } from '@expo-google-fonts/fira-code/600SemiBold'
import { FiraSans_400Regular } from '@expo-google-fonts/fira-sans/400Regular'
import { FiraSans_500Medium } from '@expo-google-fonts/fira-sans/500Medium'
import { FiraSans_600SemiBold } from '@expo-google-fonts/fira-sans/600SemiBold'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { DataProvider } from '../src/data/store.jsx'
import { FocusProvider } from '../src/data/focus.jsx'
import { OnboardingProvider, useOnboarding } from '../src/lib/onboarding.js'
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider.jsx'

SplashScreen.preventAutoHideAsync().catch(() => {})

function RootStack() {
  const { c, mode } = useTheme()
  const { ready, onboarded } = useOnboarding()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!ready) return
    SplashScreen.hideAsync().catch(() => {})
    const inWelcome = segments[0] === 'welcome'
    if (!onboarded && !inWelcome) router.replace('/welcome')
    else if (onboarded && inWelcome) router.replace('/')
  }, [ready, onboarded, segments, router])

  if (!ready) return null

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="ask" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="learning" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
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
        <DataProvider>
          <FocusProvider>
            <OnboardingProvider>
              {fontsLoaded ? <RootStack /> : null}
            </OnboardingProvider>
          </FocusProvider>
        </DataProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}
