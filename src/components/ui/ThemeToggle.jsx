import * as Haptics from 'expo-haptics'
import { Moon, Sun } from '../../icons.js'
import { Pressable } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

export default function ThemeToggle({ style }) {
  const { c, radius, mode, toggle } = useTheme()
  const next = mode === 'light' ? 'dark' : 'light'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${next} theme`}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {})
        toggle()
      }}
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
      {mode === 'light' ? (
        <Sun size={20} weight="bold" color={c.mutedForeground} />
      ) : (
        <Moon size={20} weight="bold" color={c.mutedForeground} />
      )}
    </Pressable>
  )
}
