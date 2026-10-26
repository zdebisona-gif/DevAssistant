import { useEffect, useRef, useState } from 'react'
import { Animated } from 'react-native'
import { Check } from '../../icons.js'
import { useReducedMotion } from '../../lib/useReducedMotion.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function CheckBox({ checked, size = 20, borderRadius = 6 }) {
  const { c } = useTheme()
  const reduced = useReducedMotion()
  const first = useRef(true)
  const [scale] = useState(() => new Animated.Value(1))

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!checked || reduced) {
      scale.setValue(1)
      return
    }
    scale.setValue(0.82)
    Animated.spring(scale, {
      toValue: 1,
      speed: 30,
      bounciness: 6,
      useNativeDriver: true,
    }).start()
  }, [checked, reduced, scale])

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius,
        borderWidth: 1,
        borderColor: checked ? c.primary : c.border,
        backgroundColor: checked ? c.primary : 'transparent',
        transform: [{ scale }],
      }}
    >
      {checked ? <Check size={13} weight="bold" color={c.onPrimary} /> : null}
    </Animated.View>
  )
}
