/*
 * Session owner for the app.
 *
 * Supabase persists the session in the app's private storage (expo-sqlite's
 * localStorage shim, configured in lib/supabase.js), refreshes it automatically
 * and tells us when it changes. Screens never talk to auth directly.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data?.session ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email || '').trim(),
      password: String(password || ''),
    })
    if (error) throw error
    return data.session
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const changePassword = useCallback(
    async (currentPassword, nextPassword) => {
      const email = session?.user?.email
      if (!email) throw new Error('This account has no email address.')

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: String(currentPassword ?? ''),
      })
      if (verifyError) {
        if (/invalid login credentials/i.test(String(verifyError.message || ''))) {
          const error = new Error('Current password is incorrect.')
          error.code = 'current_password'
          throw error
        }
        throw verifyError
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: String(nextPassword ?? ''),
      })
      if (updateError) throw updateError
    },
    [session],
  )

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      uid: session?.user?.id ?? null,
      loading,
      signIn,
      signOut,
      changePassword,
    }),
    [session, loading, signIn, signOut, changePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
