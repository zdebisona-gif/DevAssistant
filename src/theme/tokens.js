/*
 * Design tokens — the single source of truth for color, type, space, shape and motion.
 *
 * Color discipline: `primary` and `accent` carry meaning (actions / attention).
 * `success` and `destructive` are reserved for real deltas and errors, never decoration.
 * Charts use `chart1` (values) and `chart2` (a single comparison line) only.
 * Identity: navy ink + amber signal, Fira Sans for prose, Fira Code for numbers.
 */

export const palettes = {
  light: {
    background: '#f8fafc',
    foreground: '#1e3a8a',
    body: '#334155',
    card: '#ffffff',
    cardForeground: '#1e3a8a',
    muted: '#e9eef6',
    mutedForeground: '#475569',
    border: '#dbeafe',
    line: '#e2e8f0',
    primary: '#1e40af',
    onPrimary: '#ffffff',
    primaryFg: '#1e40af',
    primarySoft: '#dbeafe',
    accent: '#d97706',
    accentText: '#b45309',
    accentSoft: '#fef3c7',
    onAccent: '#000000',
    success: '#15803d',
    successSoft: '#dcfce7',
    destructive: '#dc2626',
    destructiveSoft: '#fee2e2',
    ring: '#1e40af',
    chart1: '#2563eb',
    chart2: '#d97706',
    chartGrid: '#e2e8f0',
    scrim: 'rgba(0,0,0,0.5)',
    overline: 'rgba(15,23,42,0.04)',
  },
  dark: {
    background: '#0b1220',
    foreground: '#e6edfa',
    body: '#c7d2e4',
    card: '#111a2e',
    cardForeground: '#e6edfa',
    muted: '#1b2539',
    mutedForeground: '#94a3b8',
    border: '#24314a',
    line: '#1f2b42',
    primary: '#2563eb',
    onPrimary: '#ffffff',
    primaryFg: '#60a5fa',
    primarySoft: '#1b2e63',
    accent: '#f59e0b',
    accentText: '#fbbf24',
    accentSoft: '#3a2c0a',
    onAccent: '#000000',
    success: '#4ade80',
    successSoft: '#12291d',
    destructive: '#ef4444',
    destructiveSoft: '#331515',
    ring: '#60a5fa',
    chart1: '#60a5fa',
    chart2: '#fbbf24',
    chartGrid: '#24314a',
    scrim: 'rgba(0,0,0,0.6)',
    overline: 'rgba(0,0,0,0.35)',
  },
}

/* One spacing scale, in 4pt steps (xs–xxl). No arbitrary gaps. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

/* Three sizes with fixed roles: sm = chips/inner, md = controls, lg = surfaces. */
export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
}

/* One type scale. Sizes only — weight comes from the chosen font token. */
export const text = {
  display: 30,
  title: 22,
  heading: 16,
  body: 14,
  label: 13,
  caption: 12,
  micro: 11,
}

export const fonts = {
  sans: 'FiraSans_400Regular',
  sansMedium: 'FiraSans_500Medium',
  sansSemiBold: 'FiraSans_600SemiBold',
  mono: 'FiraCode_400Regular',
  monoMedium: 'FiraCode_500Medium',
  monoSemiBold: 'FiraCode_600SemiBold',
}

/* Shared motion timings. One easing curve, three durations. */
export const motion = {
  fast: 140,
  base: 220,
  slow: 320,
}

/* A single, quiet elevation level — used sparingly for raised or floating surfaces. */
export function shadow(palette) {
  return {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: palette === 'dark' ? 0.45 : 0.1,
    shadowRadius: 12,
    elevation: 6,
  }
}
