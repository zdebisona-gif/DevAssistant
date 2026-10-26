import { DotsThreeVertical } from '../../icons.js'
import { useTheme } from '../../theme/ThemeProvider.jsx'
import IconButton from './IconButton.jsx'

/* The always-visible affordance that opens a row's ActionSheet. */
export default function RowMenuButton({ onPress, accessibilityLabel = 'More options', compact = false }) {
  const { c } = useTheme()
  const size = compact ? 32 : 40

  return (
    <IconButton
      icon={DotsThreeVertical}
      size={size}
      iconSize={compact ? 16 : 18}
      tone="mutedForeground"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      ripple={false}
      pressedBackground={c.overline}
      stopPropagation
    />
  )
}
