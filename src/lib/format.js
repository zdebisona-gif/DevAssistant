export function money(value, decimals = 2) {
  const sign = Number(value) < 0 ? '\u2212' : ''
  return `${sign}₱${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

/* Magnitude only — for call sites that convey direction with their own +/− prefix or color. */
export function moneyAbs(value, decimals = 2) {
  return `₱${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

/* A fixed-width mask so hidden balances never shift the layout around them. */
export const HIDDEN_MONEY = '₱••••••'

/** Money, or the mask when the user has balances hidden. */
export function moneyOr(value, hidden, decimals = 2) {
  return hidden ? HIDDEN_MONEY : money(value, decimals)
}

export function num(value) {
  return value.toLocaleString()
}

export function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function formatClock12(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''))
  if (!match) return ''
  const hours = Number(match[1])
  if (hours > 23) return ''
  const period = hours >= 12 ? 'PM' : 'AM'
  const clockHour = hours % 12 || 12
  return `${clockHour}:${match[2]} ${period}`
}

export function formatClock12Range(from, to) {
  const start = formatClock12(from)
  const end = formatClock12(to)
  if (start && end) return `${start} – ${end}`
  return start || end
}
