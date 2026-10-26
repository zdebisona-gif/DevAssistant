import * as Haptics from 'expo-haptics'
import { Pressable, Switch, Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}) {
  const { c, fonts, text } = useTheme()

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return
        Haptics.selectionAsync().catch(() => {})
        onValueChange(!value)
      }}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        opacity: disabled ? 0.5 : 1,
        backgroundColor: pressed && !disabled ? c.overline : 'transparent',
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: c.foreground }}>
          {label}
        </Text>
        {description ? (
          <Text
            style={{
              fontFamily: fonts.sans,
              fontSize: text.micro,
              lineHeight: 16,
              color: c.mutedForeground,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
        <Switch
          value={value}
          disabled={disabled}
          accessible={false}
          trackColor={{ false: c.border, true: c.primary }}
          thumbColor={c.card}
        />
      </View>
    </Pressable>
  )
}
