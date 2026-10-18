import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from '../../icons.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/*
 * A bottom sheet for short, focused forms. Slides over the screen, traps taps
 * on the sheet itself, and dismisses from the backdrop or the close button.
 */
export default function Sheet({ visible, onClose, title, subtitle, children }) {
  const { c, fonts, radius, text } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable
          accessibilityLabel="Close"
          onPress={onClose}
          style={{ flex: 1, backgroundColor: c.scrim }}
        />
        <Pressable
          onPress={() => {}}
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              hitSlop={10}
              style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} weight="bold" color={c.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8, gap: 16 }}
          >
            {children}
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}
