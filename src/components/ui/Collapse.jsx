import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, View } from 'react-native'
import { useReducedMotion } from '../../lib/useReducedMotion.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

const EASE = Easing.bezier(0.22, 0, 0, 1)

/*
 * Height + opacity disclosure for small, bounded content. Large lists should
 * render normally rather than paying for a height animation.
 *
 * The animated values are created once and never recreated, so a parent
 * re-render can't detach (and cancel) an in-flight animation. The content is
 * measured in an absolutely positioned layer, so its natural height is
 * independent of the collapsed box.
 */
export default function Collapse({ open, children, style }) {
  const { motion } = useTheme()
  const reduced = useReducedMotion()
  const [contentHeight, setContentHeight] = useState(0)
  const [height] = useState(() => new Animated.Value(0))
  const [fade] = useState(() => new Animated.Value(open ? 1 : 0))
  const measured = useRef(0)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      if (!contentHeight) return
      initialized.current = true
      height.setValue(open ? contentHeight : 0)
      fade.setValue(open ? 1 : 0)
      return
    }

    if (reduced) {
      height.setValue(open ? contentHeight : 0)
      fade.setValue(open ? 1 : 0)
      return
    }

    const animation = Animated.parallel([
      Animated.timing(height, {
        toValue: open ? contentHeight : 0,
        duration: motion.base,
        easing: EASE,
        useNativeDriver: false,
      }),
      Animated.timing(fade, {
        toValue: open ? 1 : 0,
        duration: motion.base,
        easing: EASE,
        useNativeDriver: false,
      }),
    ])
    animation.start()
    return () => animation.stop()
  }, [open, contentHeight, reduced, motion.base, height, fade])

  const handleLayout = (event) => {
    const next = Math.ceil(event.nativeEvent.layout.height)
    if (next === measured.current) return
    measured.current = next
    setContentHeight(next)
  }

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={[{ overflow: 'hidden', height, opacity: fade }, style]}
    >
      <View onLayout={handleLayout} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        {children}
      </View>
    </Animated.View>
  )
}
