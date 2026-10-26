import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/*
 * Android's "Remove animations" preference maps to Reduce Motion. Every animated
 * surface checks this hook and falls back to an instant, complete state change.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    let active = true

    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.())
      .then((value) => {
        if (active) setReduced(Boolean(value))
      })
      .catch(() => {})

    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => {
      if (active) setReduced(Boolean(value))
    })

    return () => {
      active = false
      subscription?.remove?.()
    }
  }, [])

  return reduced
}
