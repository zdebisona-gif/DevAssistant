import { Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/*
 * A lightweight grouping: an optional heading row above related content,
 * with no card, border or shadow. Prefer this over a Card for plain sections.
 */
export default function Section({ title, action, children, style }) {
  const { c, fonts, text } = useTheme()
  return (
    <View style={[{ gap: 12 }, style]}>
      {title || action ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          {title ? (
            <Text
              style={{
                flexShrink: 1,
                fontFamily: fonts.sansSemiBold,
                fontSize: text.heading,
                color: c.foreground,
              }}
            >
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action ?? null}
        </View>
      ) : null}
      {children}
    </View>
  )
}
