import * as Haptics from 'expo-haptics'
import { Moon, Sun } from '../../icons.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import IconButton from './IconButton.jsx'

export default function ThemeToggle({ style }) {
  const { mode, toggle } = useTheme()
  const next = mode === 'light' ? 'dark' : 'light'

  return (
    <IconButton
      icon={mode === 'light' ? Sun : Moon}
      iconSize={20}
      tone="mutedForeground"
      accessibilityLabel={`Switch to ${next} theme`}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {})
        toggle()
      }}
      style={style}
    />
  )
}
