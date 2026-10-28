import { useEffect, useRef, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from '../../icons.js'
import { useReducedMotion } from '../../lib/useReducedMotion.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import IconButton from './IconButton.jsx'

/*
 * A bottom sheet for short, focused forms. Slides over the screen, traps taps
 * on the sheet itself, and dismisses from the backdrop or the close button.
 */
export default function Sheet({ visible, onClose, title, subtitle, children }) {
  const { c, fonts, radius, text } = useTheme()
  const insets = useSafeAreaInsets()
  const reduced = useReducedMotion()
  const { height: windowHeight } = useWindowDimensions()
  const areaRef = useRef(null)
  const [keyboardPad, setKeyboardPad] = useState(0)
  const availableHeight = Math.max(240, windowHeight - keyboardPad)
  const maxListHeight = Math.max(160, Math.round(availableHeight * 0.88 - insets.bottom - 150))

  useEffect(() => {
    if (!visible) {
      setKeyboardPad(0)
      return undefined
    }
    /* Android modals are their own window, so the resize-on-keyboard setting
       never shrinks this sheet and the keyboard covers the fields. Measure how
       much of the sheet the keyboard actually covers and lift it by exactly
       that, which is a no-op when the window already resized (Expo Go/iOS). */
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      if (Platform.OS !== 'android') return
      const keyboardTop = Number(event?.endCoordinates?.screenY)
      if (!Number.isFinite(keyboardTop)) return
      const measure = () => {
        areaRef.current?.measureInWindow((_x, y, _width, height) => {
          setKeyboardPad(Math.max(0, Math.round(y + height - keyboardTop)))
        })
      }
      requestAnimationFrame(() => requestAnimationFrame(measure))
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardPad(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [visible])

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? 'fade' : 'slide'}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View ref={areaRef} style={{ flex: 1, paddingBottom: keyboardPad }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Pressable
            accessibilityLabel="Close"
            onPress={onClose}
            style={{ flex: 1, backgroundColor: c.scrim }}
          />
          <View
            accessibilityViewIsModal
            importantForAccessibility="yes"
            style={{
              backgroundColor: c.card,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              borderTopWidth: 1,
              borderColor: c.border,
              paddingBottom: insets.bottom + 16,
              maxHeight: '88%',
            }}
          >
            <View style={{ alignItems: 'center', paddingTop: 10 }}>
              <View style={{ width: 36, height: 4, borderRadius: 999, backgroundColor: c.border }} />
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 8,
              }}
            >
              <View style={{ flexShrink: 1, gap: 2 }}>
                <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: text.heading, color: c.foreground }}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={{ fontFamily: fonts.sans, fontSize: text.caption, color: c.mutedForeground }}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <IconButton
                icon={X}
                size={36}
                iconSize={18}
                tone="mutedForeground"
                accessibilityLabel="Close"
                onPress={onClose}
                hitSlop={10}
                ripple={false}
              />
            </View>

            <ScrollView
              style={{ flexGrow: 0, maxHeight: maxListHeight }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 16 }}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
