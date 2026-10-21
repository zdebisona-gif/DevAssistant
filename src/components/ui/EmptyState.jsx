import { Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function EmptyState({ icon: Icon, title, description, action, style }) {
  const { c, fonts, text } = useTheme()
  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: 24,
          paddingVertical: 28,
        },
        style,
      ]}
    >
      {Icon ? <Icon size={26} color={c.mutedForeground} /> : null}
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text
          style={{
            fontFamily: fonts.monoSemiBold,
            fontSize: text.title,
            lineHeight: 28,
            color: c.foreground,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: text.caption,
              lineHeight: 18,
              color: c.mutedForeground,
              textAlign: 'center',
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {action ?? null}
    </View>
  )
}
