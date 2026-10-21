import { Pressable, Text, View } from 'react-native'
import Sheet from './Sheet.jsx'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/*
 * A bottom sheet of tappable record actions (View / Edit / Delete). Replaces the
 * old long-press native alert so edit and delete are always visible as buttons.
 */
export default function ActionSheet({ visible, onClose, title, subtitle, actions = [] }) {
  const { c, fonts, radius, text } = useTheme()

  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle={subtitle}>
      <View style={{ gap: 6 }}>
        {actions.map((action) => {
          const Icon = action.icon
          const tint = action.destructive ? c.destructiveText : c.foreground
          return (
            <Pressable
              key={action.key ?? action.label}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => {
                onClose()
                action.onPress?.()
              }}
              android_ripple={{ color: c.overline, borderless: false }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                minHeight: 48,
                paddingHorizontal: 12,
                borderRadius: radius.md,
                backgroundColor: pressed ? c.overline : 'transparent',
              })}
            >
              {Icon ? <Icon size={20} weight="bold" color={tint} /> : null}
              <Text style={{ fontFamily: fonts.sansMedium, fontSize: text.body, color: tint }}>
                {action.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </Sheet>
  )
}
