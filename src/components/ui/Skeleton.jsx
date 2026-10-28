import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Animated, Easing, View } from 'react-native'
import { useReducedMotion } from '../../lib/useReducedMotion.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/*
 * Loading placeholders that mirror the real layout instead of a spinner.
 * Wrap a set of <Skeleton> blocks in one <SkeletonGroup> so they share a
 * single shimmer animation rather than each running their own loop.
 */
const ShimmerContext = createContext(null)

export function SkeletonGroup({ children, style, ...rest }) {
  const reduced = useReducedMotion()
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (reduced) {
      progress.setValue(0)
      return undefined
    }

    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    animation.start()
    return () => animation.stop()
  }, [progress, reduced])

  return (
    <ShimmerContext.Provider value={progress}>
      <View style={style} {...rest}>
        {children}
      </View>
    </ShimmerContext.Provider>
  )
}

export default function Skeleton({ width = '100%', height = 14, radius: customRadius, style }) {
  const { c, mode, radius } = useTheme()
  const progress = useContext(ShimmerContext)
  const [boxWidth, setBoxWidth] = useState(0)
  const r = customRadius ?? radius.sm
  const band = Math.max(boxWidth * 0.45, 28)

  return (
    <View
      onLayout={({ nativeEvent }) => {
        const next = nativeEvent.layout.width
        setBoxWidth((current) => (Math.abs(current - next) < 0.5 ? current : next))
      }}
      style={[
        {
          width,
          height,
          borderRadius: r,
          backgroundColor: c.muted,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {progress && boxWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -height,
            bottom: -height,
            width: band,
            backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.07)',
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-band, boxWidth + band],
                }),
              },
              { skewX: '-18deg' },
            ],
          }}
        />
      ) : null}
    </View>
  )
}
