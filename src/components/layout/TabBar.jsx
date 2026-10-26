import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ACTION_COLUMN, ASK_ACTION, TAB_ITEMS } from '../../data/nav.js'
import { useReducedMotion } from '../../lib/useReducedMotion.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const BAR_HEIGHT = 62
const PILL_HEIGHT = 44
const PILL_INSET = 8
const ACTION_SIZE = 54
const ACTION_LIFT = 18

/* The tab's column in the bar, leaving a reserved column for the raised action. */
function columnFor(index) {
  return index < ACTION_COLUMN ? index : index + 1
}

export default function TabBar({ state, emitter, navigateToTab }) {
  const { c, fonts, radius, motion, shadow } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const reduced = useReducedMotion()
  const [width, setWidth] = useState(0)

  const columns = TAB_ITEMS.length + 1
  const slot = width / columns

  const [slide] = useState(() => new Animated.Value(columnFor(state.index)))
  const pillOffset = useMemo(() => Animated.multiply(slide, slot), [slide, slot])

  useEffect(() => {
    if (reduced) {
      slide.setValue(columnFor(state.index))
      return
    }

    Animated.timing(slide, {
      toValue: columnFor(state.index),
      duration: motion.base,
      easing: Easing.bezier(0.22, 0, 0, 1),
      useNativeDriver: true,
    }).start()
  }, [state.index, slide, motion.base, reduced])

  const ask = () => {
    Haptics.selectionAsync().catch(() => {})
    router.push(ASK_ACTION.path)
  }

  return (
    <View
      style={{
        backgroundColor: c.card,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: c.line,
        paddingBottom: insets.bottom,
      }}
    >
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessibilityRole="tablist"
        style={{ height: BAR_HEIGHT, flexDirection: 'row' }}
      >
        {width > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
              left: PILL_INSET,
              width: Math.max(slot - PILL_INSET * 2, 0),
              height: PILL_HEIGHT,
              borderRadius: radius.pill,
              backgroundColor: c.primarySoft,
              transform: [{ translateX: pillOffset }],
            }}
          />
        ) : null}

        {TAB_ITEMS.flatMap((item, index) => {
          const route = state.routes.find((candidate) => candidate.name === item.route)
          const focused = route?.key === state.routes[state.index]?.key
          const tint = focused ? c.foreground : c.mutedForeground
          const tab = (
            <Pressable
              key={item.route}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={item.label}
              android_ripple={{ color: c.overline, borderless: true }}
              onPress={() => {
                if (!route) return
                Haptics.selectionAsync().catch(() => {})
                const event = emitter.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })
                if (!focused && !event.defaultPrevented) navigateToTab(route.key)
              }}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                paddingTop: 4,
              }}
            >
              <item.icon size={22} weight={focused ? 'fill' : 'regular'} color={tint} />
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: focused ? fonts.sansSemiBold : fonts.sans,
                  fontSize: 10,
                  letterSpacing: 0.2,
                  color: tint,
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          )
          /* Reserve a column for the raised action so the grid stays five equal slots. */
          return index === ACTION_COLUMN
            ? [<View key="action-slot" style={{ flex: 1 }} />, tab]
            : [tab]
        })}

        {width > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask Zen-I"
            android_ripple={{ color: c.overline, borderless: true }}
            onPress={ask}
            style={{
              position: 'absolute',
              left: ACTION_COLUMN * slot,
              top: -ACTION_LIFT,
              width: slot,
              height: BAR_HEIGHT + ACTION_LIFT,
              alignItems: 'center',
            }}
          >
            {({ pressed }) => (
              <View
                style={[
                  {
                    width: ACTION_SIZE,
                    height: ACTION_SIZE,
                    borderRadius: radius.pill,
                    backgroundColor: c.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
                  Platform.OS === 'web' ? null : shadow,
                ]}
              >
                <ASK_ACTION.icon size={24} weight="fill" color={c.onPrimary} />
              </View>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}
