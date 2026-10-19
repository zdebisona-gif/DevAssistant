/* Plain-language copy for the few auth failures a person can actually act on. */
export function describeAuthError(error, fallback = 'Could not sign in. Try again.') {
  const message = String(error?.message || error || '')

  if (/invalid login credentials/i.test(message)) {
    return 'That email or password is not correct.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Confirm your email address, then try again.'
  }
  if (/rate limit|too many|security purposes/i.test(message)) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  if (/network|fetch|failed to fetch/i.test(message)) {
    return 'Could not reach the server. Check your connection.'
  }
  if (/invalid email/i.test(message)) {
    return 'Enter a valid email address.'
  }
  if (/different from the old password|same password/i.test(message)) {
    return 'Choose a password different from your current one.'
  }
  if (/password.*(at least|too short|too weak|weak|length)/i.test(message)) {
    return 'Choose a stronger password (at least 8 characters).'
  }
  return fallback
}
