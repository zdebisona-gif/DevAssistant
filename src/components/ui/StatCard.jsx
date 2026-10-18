import { Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/*
 * A quiet metric: label over a tabular number, with an optional delta.
 * Borderless — surfaces come from spacing, not from a box.
 */
export default function StatCard({ label, value, hint, delta, deltaIsGood = true, icon: Icon, style }) {
  const { c, fonts, text } = useTheme()
  const hasDelta = typeof delta === 'number'
  const deltaPositive = hasDelta && (delta >= 0) === deltaIsGood

  return (
    <View style={[{ flexGrow: 1, flexBasis: '47%', minWidth: 0, gap: 4 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {Icon ? <Icon size={13} color={c.mutedForeground} /> : null}
        <Text
          numberOfLines={1}
          style={{
            fontFamily: fonts.sansSemiBold,
            fontSize: text.micro,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: c.mutedForeground,
          }}
        >
          {label}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}>
        <Text
          style={{
            fontFamily: fonts.monoSemiBold,
            fontSize: text.title,
            color: c.foreground,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value}
        </Text>
        {hasDelta ? (
          <Text
            style={{
              fontFamily: fonts.sansMedium,
              fontSize: text.caption,
              color: deltaPositive ? c.success : c.destructive,
              fontVariant: ['tabular-nums'],
            }}
          >
            {delta >= 0 ? '+' : '−'}
            {Math.abs(delta)}%
          </Text>
        ) : null}
      </View>

      {hint ? (
        <Text
          numberOfLines={2}
          style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  )
}
