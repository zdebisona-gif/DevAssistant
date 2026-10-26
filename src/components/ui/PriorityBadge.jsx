import { Text, View } from 'react-native'
import { WarningCircle } from '../../icons.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function PriorityBadge({ style }) {
  const { c, fonts, radius, text } = useTheme()

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: c.accent,
          borderRadius: radius.pill,
          paddingHorizontal: 7,
          paddingVertical: 2,
        },
        style,
      ]}
    >
      <WarningCircle size={11} weight="fill" color={c.onAccent} />
      <Text
        style={{
          fontFamily: fonts.sansSemiBold,
          fontSize: text.micro,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: c.onAccent,
        }}
      >
        Priority
      </Text>
    </View>
  )
}
