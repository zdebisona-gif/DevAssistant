import * as Haptics from 'expo-haptics'
import { useEffect, useState } from 'react'
import { Animated, Easing, Pressable, Text, View } from 'react-native'
import { useReducedMotion } from '../../lib/useReducedMotion.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const HEIGHT = 48
const INSET = 4
const INDICATOR_HEIGHT = HEIGHT - INSET * 2

export default function SegmentedControl({ options, value, onChange, style, accessibilityLabel }) {
  const { c, fonts, radius, text, motion } = useTheme()
  const reduced = useReducedMotion()
  const [width, setWidth] = useState(0)
  const [slide] = useState(() => new Animated.Value(0))

  const index = Math.max(
    0,
    options.findIndex((option) => option.key === value),
  )
  const segmentWidth = width > 0 ? (width - INSET * 2) / options.length : 0

  useEffect(() => {
    if (reduced) {
      slide.setValue(index)
      return
    }

    Animated.timing(slide, {
      toValue: index,
      duration: motion.base,
      easing: Easing.bezier(0.22, 0, 0, 1),
      useNativeDriver: true,
    }).start()
  }, [index, reduced, slide, motion.base])

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          height: HEIGHT,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.muted,
          paddingHorizontal: INSET,
        },
        style,
      ]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: INSET,
            left: INSET,
            width: segmentWidth,
            height: INDICATOR_HEIGHT,
            borderRadius: radius.pill,
            backgroundColor: c.primary,
            transform: [{ translateX: Animated.multiply(slide, segmentWidth) }],
          }}
        />
      ) : null}

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {options.map((option) => {
          const selected = option.key === value
          return (
            <Pressable
              key={option.key}
              accessibilityRole="tab"
              accessibilityLabel={`${option.label}${option.count ? `, ${option.count}` : ''}`}
              accessibilityState={{ selected }}
              onPress={() => {
                if (selected) return
                Haptics.selectionAsync().catch(() => {})
                onChange?.(option.key)
              }}
              style={{
                flex: 1,
                minHeight: HEIGHT,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 8,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, maxWidth: '100%' }}>
                <Text
                  numberOfLines={1}
                  style={{
                    flexShrink: 1,
                    fontFamily: selected ? fonts.sansSemiBold : fonts.sansMedium,
                    fontSize: text.caption,
                    color: selected ? c.onPrimary : c.mutedForeground,
                  }}
                >
                  {option.label}
                </Text>
                {option.count ? (
                  <Text
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: text.micro,
                      color: selected ? c.onPrimary : c.mutedForeground,
                      fontVariant: ['tabular-nums'],
                      opacity: selected ? 0.8 : 0.7,
                    }}
                  >
                    {option.count}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
