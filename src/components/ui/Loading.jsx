import { ActivityIndicator, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function Loading({ label = 'Loading', style }) {
  const { c, fonts, text } = useTheme()
  return (
    <View
      style={[{ alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 48 }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator color={c.mutedForeground} />
      <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
        {label}
      </Text>
    </View>
  )
}
