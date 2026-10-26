import { useLayoutEffect, useMemo, useState } from 'react'
import { Animated, Easing } from 'react-native'
import { useReducedMotion } from '../../lib/useReducedMotion.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/* A quiet entrance for content that appears after the screen has settled. */
export default function Reveal({ children, delay = 0, distance = 6, offsetX = 0, style }) {
  const { motion } = useTheme()
  const reduced = useReducedMotion()
  const [progress] = useState(() => new Animated.Value(0))
  const translateY = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
    [progress, distance],
  )
  const translateX = useMemo(
    () => progress.interpolate({ inputRange: [0, 1], outputRange: [offsetX, 0] }),
    [offsetX, progress],
  )

  useLayoutEffect(() => {
    if (reduced) {
      progress.setValue(1)
      return undefined
    }

    progress.setValue(0)
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.base,
      delay,
      easing: Easing.bezier(0.22, 0, 0, 1),
      useNativeDriver: true,
    })
    animation.start()
    return () => animation.stop()
  }, [delay, motion.base, progress, reduced])

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [{ translateX }, { translateY }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}
