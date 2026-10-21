import { CaretLeft } from '../../icons.js'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export function IconButton({ icon: Icon, onPress, accessibilityLabel, style }) {
  const { c, radius } = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={2}
      android_ripple={{ color: c.overline, borderless: true }}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.pill,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Icon size={22} weight="bold" color={c.foreground} />
    </Pressable>
  )
}

export default function Screen({
  title,
  subtitle,
  left,
  right,
  children,
  scroll = true,
  tabbed = true,
  contentContainerStyle,
}) {
  const { c, fonts, text } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const header = (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      {left === 'back' ? (
        <IconButton
          icon={CaretLeft}
          accessibilityLabel="Go back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={{ marginLeft: -8 }}
        />
      ) : (
        left
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: fonts.monoSemiBold, fontSize: text.heading + 1, color: c.foreground }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.sans,
              fontSize: text.micro,
              color: c.mutedForeground,
              marginTop: 1,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{right}</View>
      ) : null}
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            {
              paddingHorizontal: 16,
              paddingBottom: (tabbed ? 24 : insets.bottom + 24) + 24,
              gap: 24,
            },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </View>
  )
}

export const hairline = StyleSheet.hairlineWidth
