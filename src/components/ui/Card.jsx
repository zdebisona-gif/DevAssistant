import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/*
 * A surface for content that genuinely needs grouping (charts, message bubbles,
 * lists with rows). Depth rule: either a hairline border or a shadow, never both.
 * For plain sections use <Section> and spacing instead.
 */
export function Card({ children, style, padded = false }) {
  const { c, radius } = useTheme()
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          overflow: 'hidden',
          padding: padded ? 16 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

export function CardHeader({ title, subtitle, action, style }) {
  const { c, fonts, text } = useTheme()
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
        },
        style,
      ]}
    >
      <View style={{ flexShrink: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.heading, color: c.foreground }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View style={{ flexShrink: 0 }}>{action}</View> : null}
    </View>
  )
}

export function CardBody({ children, style }) {
  const { spacing } = useTheme()
  return (
    <View style={[{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: spacing.md }, style]}>
      {children}
    </View>
  )
}
