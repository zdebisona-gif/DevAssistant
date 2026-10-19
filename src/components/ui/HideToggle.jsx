import { Pressable } from 'react-native'
import { Eye, EyeSlash } from '../../icons.js'
import { usePrivacy } from '../../data/privacy.jsx'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/* Masks account balances and debt amounts on screen. Not synced — this device only. */
export default function HideToggle() {
  const { c } = useTheme()
  const { hidden, toggle } = usePrivacy()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: hidden }}
      accessibilityLabel={hidden ? 'Show balances' : 'Hide balances'}
      onPress={toggle}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {hidden ? (
        <EyeSlash size={20} weight="bold" color={c.primaryFg} />
      ) : (
        <Eye size={20} weight="bold" color={c.mutedForeground} />
      )}
    </Pressable>
  )
}
