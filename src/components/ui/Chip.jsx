import { Pressable, Text } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function Chip({ children, onPress }) {
  const { c, fonts, radius, text } = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: c.overline }}
      style={({ pressed }) => ({
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.card,
        paddingHorizontal: 14,
        paddingVertical: 8,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
        {children}
      </Text>
    </Pressable>
  )
}
