import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, Text } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const HEIGHTS = { sm: 40, md: 48, icon: 48 }

export default function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  children,
  to,
  disabled,
  loading = false,
  onPress,
  style,
  accessibilityLabel,
}) {
  const { c, fonts, radius } = useTheme()
  const router = useRouter()
  const isDisabled = disabled || loading

  const palette = {
    primary: { bg: c.primary, border: 'transparent', text: c.onPrimary },
    secondary: { bg: c.card, border: c.border, text: c.foreground },
    destructive: { bg: c.destructive, border: 'transparent', text: c.onPrimary },
    ghost: { bg: 'transparent', border: 'transparent', text: c.mutedForeground },
  }[variant]

  const height = HEIGHTS[size] ?? HEIGHTS.md
  const isIcon = size === 'icon'

  const handlePress = (event) => {
    if (isDisabled) return
    Haptics.selectionAsync().catch(() => {})
    if (to) router.push(to)
    onPress?.(event)
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={isDisabled}
      onPress={handlePress}
      android_ripple={isDisabled ? undefined : { color: c.overline, borderless: false }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height,
          minWidth: height,
          paddingHorizontal: isIcon ? 0 : size === 'sm' ? 14 : 18,
          borderRadius: radius.pill,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === 'secondary' ? 1 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.text} />
      ) : (
        <>
          {Icon ? <Icon size={16} weight="bold" color={palette.text} /> : null}
          {children ? (
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: size === 'sm' ? 13 : 14,
                color: palette.text,
              }}
            >
              {children}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  )
}
