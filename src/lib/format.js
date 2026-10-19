export function money(value, decimals = 2) {
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
