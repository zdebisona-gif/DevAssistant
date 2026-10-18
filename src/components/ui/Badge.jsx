import { Text, View } from 'react-native'
import { useTheme } from '../../theme/ThemeProvider.jsx'

function tones(c) {
  return {
    default: { bg: c.muted, border: 'transparent', text: c.foreground },
    primary: { bg: c.primarySoft, border: 'transparent', text: c.primaryFg },
    accent: { bg: c.accentSoft, border: 'transparent', text: c.accentText },
    success: { bg: c.successSoft, border: 'transparent', text: c.success },
    danger: { bg: c.destructiveSoft, border: 'transparent', text: c.destructive },
    outline: { bg: 'transparent', border: c.border, text: c.mutedForeground },
  }
}

export default function Badge({ children, tone = 'default', icon: Icon, style }) {
  const { c, fonts, radius } = useTheme()
  const t = tones(c)[tone] ?? tones(c).default
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
          backgroundColor: t.bg,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: radius.pill,
          paddingHorizontal: 8,
          paddingVertical: 2,
        },
        style,
      ]}
    >
      {Icon ? <Icon size={11} weight="bold" color={t.text} /> : null}
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 11,
          color: t.text,
        }}
      >
        {children}
      </Text>
    </View>
  )
}
