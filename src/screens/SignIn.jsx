import { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Logo from '../components/layout/Logo.jsx'
import Button from '../components/ui/Button.jsx'
import Field from '../components/ui/Field.jsx'
import ThemeToggle from '../components/ui/ThemeToggle.jsx'
import { useAuth } from '../data/auth.jsx'
import { LockKey } from '../icons.js'
import { describeAuthError } from '../lib/auth.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

export default function SignIn() {
  const { c, fonts, radius, text } = useTheme()
  const insets = useSafeAreaInsets()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy) return
    const address = email.trim()
    if (!address || !password) {
      setError('Enter your email and password.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await signIn(address, password)
    } catch (cause) {
      setError(describeAuthError(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: insets.top + 16,
            paddingBottom: Math.max(insets.bottom, 16) + 24,
            justifyContent: 'space-between',
            gap: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Logo />
            <ThemeToggle />
          </View>

          <View style={{ gap: 24 }}>
            <View style={{ gap: 10 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: radius.md,
                  backgroundColor: c.primarySoft,
                }}
              >
                <LockKey size={22} weight="duotone" color={c.primaryFg} />
              </View>
              <Text
                style={{
                  fontFamily: fonts.monoSemiBold,
                  fontSize: text.title,
                  color: c.foreground,
                }}
              >
                Sign in to Zen-I
              </Text>
              <Text
                style={{
                  fontFamily: fonts.sans,
                  fontSize: text.body,
                  lineHeight: 21,
                  color: c.mutedForeground,
                }}
              >
                Your notes, money, plans and study records stay private to your account.
              </Text>
            </View>

            <View style={{ gap: 14 }}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                editable={!busy}
              />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                editable={!busy}
              />
              {error ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={{
                    fontFamily: fonts.sansMedium,
                    fontSize: text.caption,
                    color: c.destructiveText,
                  }}
                >
                  {error}
                </Text>
              ) : null}
              <Button variant="primary" onPress={submit} loading={busy} disabled={busy}>
                Sign in
              </Button>
            </View>
          </View>

          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: text.micro,
              lineHeight: 17,
              textAlign: 'center',
              color: c.mutedForeground,
            }}
          >
            This is a private, single-account app. The account is created in Supabase; there is no
            public sign-up.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
