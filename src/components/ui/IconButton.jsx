import { createElement, useMemo } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/*
 * One icon button for the whole app.
 *
 * The icon element is memoized, so a parent re-render does not re-render the
 * SVG subtree (every SVG prop update is a native view update on Android).
 * Press feedback is native (`android_ripple`) where the caller opts in.
 */
export default function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  size = 44,
  iconSize = 22,
  iconWeight = 'bold',
  color,
  tone = 'foreground',
  background,
  pressedBackground,
  pressedOpacity = 0.7,
  borderRadius,
  hitSlop,
  ripple = true,
  stopPropagation = false,
  disabled = false,
  style,
}) {
  const { c, radius } = useTheme()
  const tint = color ?? c[tone]

  const icon = useMemo(
    () => createElement(Icon, { size: iconSize, weight: iconWeight, color: tint }),
    [Icon, iconSize, iconWeight, tint],
  )

  const handlePress = stopPropagation
    ? (event) => {
        event.stopPropagation()
        onPress?.()
      }
    : onPress

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      hitSlop={hitSlop}
      android_ripple={ripple ? { color: c.overline, borderless: true } : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: borderRadius ?? radius.pill,
          backgroundColor:
            (pressed ? pressedBackground : undefined) ?? background ?? 'transparent',
          opacity: pressed && !pressedBackground ? pressedOpacity : 1,
        },
        style,
      ]}
    >
      {icon}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
