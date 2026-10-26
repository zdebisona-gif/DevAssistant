import { useEffect, useState } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import { useReducedMotion } from '../../lib/useReducedMotion.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

function toneFor(pct, c, tone) {
  if (tone === 'limit') {
    if (pct >= 100) return c.destructive
    if (pct >= 85) return c.accent
    return c.primary
  }
  return pct >= 100 ? c.success : c.primary
}

export default function ProgressBar({
  label,
  value,
  limit = 100,
  unit = '',
  meta,
  percentOnly = false,
  tone = 'progress',
  style,
}) {
  const { c, fonts, text, motion } = useTheme()
  const reduced = useReducedMotion()
  const raw = percentOnly ? value : limit > 0 ? (value / limit) * 100 : 0
  const pct = Number.isFinite(raw) ? Math.min(100, Math.max(0, Math.round(raw))) : 0
  const [fill] = useState(() => new Animated.Value(pct))

  useEffect(() => {
    if (reduced) {
      fill.setValue(pct)
      return
    }

    Animated.timing(fill, {
      toValue: pct,
      duration: motion.base,
      easing: Easing.bezier(0.22, 0, 0, 1),
      useNativeDriver: true,
    }).start()
  }, [pct, reduced, fill, motion.base])

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
        <Animated.View
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 999,
            backgroundColor: toneFor(pct, c, tone),
            transform: [
              { scaleX: fill.interpolate({ inputRange: [0, 100], outputRange: [0, 1] }) },
            ],
            transformOrigin: [0, 0.5, 0],
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
