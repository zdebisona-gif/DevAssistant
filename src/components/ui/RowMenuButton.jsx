import { Pressable } from 'react-native'
import { DotsThreeVertical } from '../../icons.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'

/* The always-visible affordance that opens a row's ActionSheet. */
export default function RowMenuButton({ onPress, accessibilityLabel = 'More options', compact = false }) {
  const { c } = useTheme()
  const size = compact ? 32 : 40

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={(event) => {
        event.stopPropagation()
        onPress()
      }}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        backgroundColor: pressed ? c.overline : 'transparent',
      })}
    >
      <DotsThreeVertical size={compact ? 16 : 18} weight="bold" color={c.mutedForeground} />
    </Pressable>
  )
}
