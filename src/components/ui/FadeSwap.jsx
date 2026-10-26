import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing } from 'react-native'
import { useReducedMotion } from '../../lib/useReducedMotion.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/* A quiet crossfade when a segmented surface swaps its content. */
export default function FadeSwap({ swapKey, children, style }) {
  const { motion } = useTheme()
  const reduced = useReducedMotion()
  const [progress] = useState(() => new Animated.Value(1))
  const first = useRef(true)
  const translateY = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }),
    [progress],
  )

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }

    if (reduced) {
      progress.setValue(1)
      return
    }

    progress.setValue(0)
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.fast,
      easing: Easing.bezier(0.22, 0, 0, 1),
      useNativeDriver: true,
    }).start()
  }, [swapKey, reduced, progress, motion.fast])

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}
