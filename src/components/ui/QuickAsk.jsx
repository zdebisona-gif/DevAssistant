import { useRouter } from 'expo-router'
import { PaperPlaneRight, Sparkle, SquaresFour } from '../../icons.js'
import { useEffect, useState } from 'react'
import { Animated, Easing, Keyboard, Pressable, Text, TextInput, View } from 'react-native'
import Svg, { Rect } from 'react-native-svg'
import { useData } from '../../data/store.jsx'
import { deriveSuggestions } from '../../lib/ask.js'
import { useReducedMotion } from '../../lib/useReducedMotion.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import Button from './Button.jsx'
import Chip from './Chip.jsx'

const SEND_SIZE = 34

export default function QuickAsk() {
  const { c, fonts, radius, text, motion } = useTheme()
  const { data } = useData()
  const router = useRouter()
  const reduced = useReducedMotion()
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const [glow] = useState(() => new Animated.Value(0))
  const suggestions = deriveSuggestions(data, 3)

  useEffect(() => {
    if (!focused) {
      if (reduced) {
        glow.setValue(0)
        return undefined
      }

      const animation = Animated.timing(glow, {
        toValue: 0,
        duration: motion.fast,
        easing: Easing.bezier(0.22, 0, 0, 1),
        useNativeDriver: true,
      })
      animation.start()
      return () => animation.stop()
    }

    if (reduced) {
      glow.setValue(1)
      return undefined
    }

    const animation = Animated.timing(glow, {
      toValue: 1,
      duration: motion.slow,
      easing: Easing.bezier(0.22, 0, 0, 1),
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [focused, glow, motion.fast, motion.slow, reduced])

  const submit = (raw) => {
    const q = raw.trim()
    if (!q) return
    Keyboard.dismiss()
    setValue('')
    router.push({ pathname: '/ask', params: { q } })
  }

  const stroke = 1 // main line (was 1.5)
  const glowStroke = 2.5 // soft glow (was 4)
  const pad = glowStroke / 2 // inset so the stroke isn't clipped by the SVG bounds
  const width = Math.max(0, box.width - glowStroke)
  const height = Math.max(0, box.height - glowStroke)
  const corner = Math.max(0, radius.md - pad)

  return (
    <View style={{ gap: 10 }}>
      {/* Wrapper: measured, and the positioning context for the outline */}
      <View
        onLayout={({ nativeEvent }) => {
          const { width: nextWidth, height: nextHeight } = nativeEvent.layout
          setBox((prev) =>
            prev.width === nextWidth && prev.height === nextHeight
              ? prev
              : { width: nextWidth, height: nextHeight },
          )
        }}
        style={{ width: '100%', position: 'relative' }}
      >
        {/* Row: only the real content lives here */}
        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 48,
            borderRadius: radius.md,
            backgroundColor: c.card,
            paddingLeft: 14,
            paddingRight: 10,
          }}
        >
          <Sparkle size={18} weight="fill" color={c.primary} />
          <TextInput
            value={value}
            onChangeText={setValue}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={() => submit(value)}
            returnKeyType="send"
            placeholder="Log or ask — e.g. “paid 100 in jollibee using cash”"
            placeholderTextColor={c.mutedForeground}
            accessibilityLabel="Ask Zen-I"
            numberOfLines={1}
            textAlignVertical="center"
            style={{
              flex: 1,
              minWidth: 0,
              flexShrink: 1,
              paddingVertical: 12,
              fontFamily: fonts.sans,
              fontSize: text.body,
              includeFontPadding: false,
              color: c.foreground,
            }}
          />
          <Button
            variant="primary"
            size="icon"
            icon={PaperPlaneRight}
            accessibilityLabel="Send question"
            disabled={!value.trim()}
            onPress={() => submit(value)}
            style={{
              flexShrink: 0,
              width: SEND_SIZE,
              height: SEND_SIZE,
              minWidth: SEND_SIZE,
              minHeight: SEND_SIZE,
              borderRadius: SEND_SIZE / 2,
            }}
          />
        </View>

        {/* Outline overlay: sibling of the row, explicitly absolute so it never affects layout */}
        {box.width > 0 && box.height > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: box.width,
              height: box.height,
              opacity: glow,
            }}
          >
            <Svg width={box.width} height={box.height}>
              <Rect
                x={pad}
                y={pad}
                width={width}
                height={height}
                rx={corner}
                fill="none"
                stroke={c.primary}
                strokeWidth={glowStroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.14}
              />
              <Rect
                x={pad}
                y={pad}
                width={width}
                height={height}
                rx={corner}
                fill="none"
                stroke={c.primary}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.7}
              />
            </Svg>
          </Animated.View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open shortcut mode"
          onPress={() => {
            Keyboard.dismiss()
            router.push({ pathname: '/ask', params: { mode: 'shortcut' } })
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 48,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: c.primary,
            backgroundColor: c.primarySoft,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <SquaresFour size={13} weight="bold" color={c.primary} />
          <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.caption, color: c.primary }}>
            Shortcuts
          </Text>
        </Pressable>
        {suggestions.map((suggestion) => (
          <Chip key={suggestion} onPress={() => submit(suggestion)}>
            {suggestion}
          </Chip>
        ))}
      </View>
    </View>
  )
}