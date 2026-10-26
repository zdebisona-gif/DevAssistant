import { CaretRight } from '../../icons.js'
import { Pressable, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function SettingsRow({ label, value, onPress, right, destructive = false }) {
  const { c, fonts, text } = useTheme()
  const content = (
    <>
      <Text
        style={{
          flex: 1,
          fontFamily: fonts.sansMedium,
          fontSize: text.body,
          color: destructive ? c.destructiveText : c.foreground,
        }}
      >
        {label}
      </Text>
      {value ? (
        <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
          {value}
        </Text>
      ) : null}
      {right ?? <CaretRight size={14} weight="bold" color={c.mutedForeground} />}
    </>
  )

  if (!onPress) {
    return (
      <View
        style={{
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        {content}
      </View>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: pressed ? c.overline : 'transparent',
      })}
    >
      {content}
    </Pressable>
  )
}
