import { Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

function toneFor(pct, c) {
  if (pct >= 100) return c.destructive
  if (pct >= 85) return c.accent
  return c.primary
}

export default function ProgressBar({
  label,
  value,
  limit = 100,
  unit = '',
  meta,
  percentOnly = false,
  style,
}) {
  const { c, fonts, text } = useTheme()
  const pct = percentOnly
    ? Math.round(value)
    : limit > 0
      ? Math.round((value / limit) * 100)
      : 0

  const rightText = percentOnly
    ? `${pct}%`
    : `${value.toLocaleString()}${unit} / ${limit.toLocaleString()}${unit}`

  return (
    <View
      style={style}
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${pct}%`}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <View
        style={{
          marginBottom: 6,
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text
          numberOfLines={1}
          style={{ flexShrink: 1, fontFamily: fonts.sansMedium, fontSize: text.label, color: c.foreground }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: fonts.mono,
            fontSize: text.micro,
            color: c.mutedForeground,
            fontVariant: ['tabular-nums'],
          }}
        >
          {rightText}
        </Text>
      </View>
      <View style={{ height: 6, width: '100%', overflow: 'hidden', borderRadius: 999, backgroundColor: c.muted }}>
        <View
          style={{
            height: '100%',
            width: `${Math.min(Math.max(pct, 0), 100)}%`,
            borderRadius: 999,
            backgroundColor: toneFor(pct, c),
          }}
        />
      </View>
      {meta ? (
        <Text style={{ marginTop: 4, fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
          {meta}
        </Text>
      ) : null}
    </View>
  )
}
